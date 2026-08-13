/**
 * Promote genuine scraped postings without calling the AI parser.
 *
 * This is intentionally conservative: it fills only trusted listing metadata
 * and keeps the complete source text as the description. Invalid shells and
 * expired notices are discarded locally.
 *
 *   npx tsx backfill-metadata-only.ts           # dry-run
 *   npx tsx backfill-metadata-only.ts --apply
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import {
  discardRawJob,
  markJobParsed,
  saveJob,
  saveJobDetails,
} from './db';
import { extractRecentRelativePostedDate, extractPostedDate, normalizePostedDate } from './posted-date';
import { normalizeJobTitle } from './title';
import { extractListingType } from './requirements';
import { normalizeLocation } from './location';
import { looksUnrendered } from './utils';
import { formatCapturedDescription } from './fallback-description';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const DETERMINISTIC_PARSER_VERSION = 0;

type RawRow = {
  id: string;
  url: string;
  application_url: string | null;
  source: string;
  raw_text: string;
  title: string | null;
  first_seen_at: string;
  posted_at: string | null;
};

const EXPIRED_PAGE = /already expired|no longer available|position has been filled|job has moved/i;
const BOT_OR_SHELL = /(?:checking your browser|enable javascript|captcha|cloudflare|access denied|security verification)/i;
const NON_JOB_PAGE = /candidate profile|sign-in partner|allows you to apply for job opportunities/i;
const DATE_VALUE = '(?:[A-Za-z]{3,9}\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s*\\d{2,4}|\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})';
const CLOSING_DATE = new RegExp(`(?:posting\\s+end\\s+date|closing\\s+date|application\\s+deadline|apply\\s+by|deadline|applications?\\s+must\\s+be\\s+received[^:]{0,80})\\s*[:\\-]?\\s*(${DATE_VALUE})`, 'i');

function invalidRaw(rawText: string): boolean {
  const text = rawText.trim();
  return text.length < 100 || looksUnrendered(text) || EXPIRED_PAGE.test(text) || BOT_OR_SHELL.test(text) || NON_JOB_PAGE.test(text);
}

function extractLocation(rawText: string): string {
  const workday = /apply\s*locations?(.+?)(?:time\s*type|posted\s*on|job\s*requisition)/i.exec(rawText)?.[1];
  const labelled = /(?:^|\b)locations?\s*[:\-]?\s*(.+?)(?:\btime\s*type|\bposted\s+on|\bjob\s+requisition|\bdepartment\s*[:\-]|$)/i.exec(rawText)?.[1];
  return normalizeLocation((workday ?? labelled ?? '').replace(/\s+/g, ' ').trim());
}

function extractClosingDate(rawText: string): string {
  const value = CLOSING_DATE.exec(rawText)?.[1];
  return value ? normalizePostedDate(value) ?? '' : '';
}

function extractPostedAt(row: RawRow): string | null {
  return normalizePostedDate(row.posted_at)
    || extractPostedDate(row.raw_text)
    || extractRecentRelativePostedDate(row.raw_text);
}

function buildDetails(row: RawRow) {
  const title = normalizeJobTitle(row.title || row.raw_text.match(/^[^\n]{3,160}/)?.[0] || row.id);
  const listingType = extractListingType(row.raw_text, title, false);
  const postedAt = extractPostedAt(row);
  const isStudent = /\b(?:student|co-?op)\b/i.test(`${title}\n${row.raw_text}`) ? 1 : 0;

  return {
    title,
    listingType,
    postedAt,
    isStudent,
    location: extractLocation(row.raw_text),
    closingDate: extractClosingDate(row.raw_text),
  };
}

async function main() {
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const result = await db.execute(`
    SELECT r.id, r.url, r.application_url, r.source, r.raw_text, r.title, r.first_seen_at, r.posted_at,
           d.parser_version
    FROM raw_jobs r
    LEFT JOIN job_details d ON d.id = r.id
    WHERE (r.parsed_at IS NULL OR d.parser_version = 0)
      AND (r.raw_text IS NOT NULL AND r.raw_text != '')
    ORDER BY r.scraped_at ASC
  `);

  const rows = result.rows as unknown as RawRow[];
  const invalid = rows.filter(row => invalidRaw(row.raw_text));
  const genuine = rows.filter(row => !invalidRaw(row.raw_text));
  console.log(`[Metadata backfill] ${APPLY ? 'Applying' : 'Dry run'}: ${genuine.length} genuine row(s), ${invalid.length} invalid row(s).`);

  const bySource = new Map<string, number>();
  for (const row of genuine) bySource.set(row.source, (bySource.get(row.source) ?? 0) + 1);
  console.log('[Metadata backfill] Genuine by source:', JSON.stringify(Object.fromEntries(bySource), null, 2));

  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to write.');
    return;
  }

  for (const row of invalid) await discardRawJob(db, row.id);

  let promoted = 0;
  let hidden = 0;
  for (const row of genuine) {
    const details = buildDetails(row);
    const description = formatCapturedDescription(row.raw_text);
    if (!description) {
      await db.execute({ sql: `UPDATE jobs SET is_active = 0 WHERE id = ?`, args: [row.id] });
      hidden += 1;
      continue;
    }
    await saveJob(db, {
      id: row.id,
      url: row.application_url ?? row.url,
      source: row.source,
      first_seen_at: row.first_seen_at,
    });
    await saveJobDetails(db, {
      id: row.id,
      job_title: details.title,
      department: '',
      location: details.location,
      salary_range: '',
      description,
      closing_date: details.closingDate,
      is_inventory: details.listingType === 'inventory' ? 1 : 0,
      listing_type: details.listingType,
      is_student: details.isStudent,
      benefits: JSON.stringify([]),
      required_skills: JSON.stringify([]),
      experience_requirements: JSON.stringify([]),
      education_requirements: JSON.stringify([]),
      license_requirements: JSON.stringify([]),
      language_requirements: JSON.stringify([]),
      certification_requirements: JSON.stringify([]),
      software_requirements: JSON.stringify([]),
      medical_requirements: JSON.stringify([]),
      responsibility_tags: JSON.stringify([]),
      qualification_tags: JSON.stringify([]),
      posted_at: details.postedAt,
      parser_version: DETERMINISTIC_PARSER_VERSION,
    });
    if (details.postedAt) {
      await db.execute({
        sql: `UPDATE raw_jobs SET posted_at = COALESCE(posted_at, ?) WHERE id = ?`,
        args: [details.postedAt, row.id],
      });
    }
    await markJobParsed(db, row.id);
    promoted += 1;
  }

  console.log(`[Metadata backfill] Promoted ${promoted}; hidden ${hidden}; discarded ${invalid.length}.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
