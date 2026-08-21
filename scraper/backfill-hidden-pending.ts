/**
 * Recover source-backed application deadlines from currently hidden parsed
 * jobs, then put a bounded batch back into the pending-details queue.
 *
 *   npx tsx backfill-hidden-pending.ts                 # dry run
 *   npx tsx backfill-hidden-pending.ts --limit=100 --apply
 *
 * The existing job_details row is retained for recovery. Clearing
 * raw_jobs.parsed_at is the pending state; the API hides the parsed body while
 * the row waits for the normal parser queue.
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { normalizeActiveClosingDateStatus } from './closing-date';
import { extractRawJobTitle, extractUrlJobTitle, isUsableJobTitle } from './title';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const limitArgument = process.argv.find(value => value.startsWith('--limit='));
const LIMIT = Math.max(1, Math.min(100, Number(limitArgument?.split('=')[1] ?? 100)));

const EVIDENCE_PATTERN = /closing date|deadline|apply by|apply before|last day to apply|applications? must be received|expires|posting close|posting end date|close date|time left to apply|end date/i;

function extractEvidence(rawText: string): string {
  const text = rawText.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  const match = EVIDENCE_PATTERN.exec(text);
  const index = match?.index ?? 0;
  const start = Math.max(0, index - 24);
  return text.slice(start, start + 180);
}

type Row = {
  id: string;
  public_id: number;
  source: string;
  title: string | null;
  raw_text: string;
  pending_closing_date: string | null;
  pending_closing_date_status: string | null;
  parsed_at: string | null;
  verified_at: string | null;
  closing_date: string | null;
  date_recovery_eligible: number;
  detail_title: string | null;
  display_title: string | null;
  url_title: string | null;
  public_url: string | null;
};

async function main() {
  if (!process.env.NEON_CURRENT_DATABASE_URL || !process.env.NEON_ARCHIVE_DATABASE_URL) {
    throw new Error('This production backfill requires explicit NEON_CURRENT_DATABASE_URL and NEON_ARCHIVE_DATABASE_URL values; refusing to write through the local Turso fallback.');
  }
  const db = await initDb();
  const result = await db.execute(`
    SELECT j.id, j.public_id, j.source, j.verified_at,
           r.title, r.raw_text, r.pending_closing_date,
           r.pending_closing_date_status, r.parsed_at,
           d.closing_date,
           CASE WHEN (d.closing_date IS NULL OR TRIM(d.closing_date) = '')
                  AND (r.pending_closing_date IS NULL OR TRIM(r.pending_closing_date) = '')
                  AND COALESCE(r.pending_closing_date_status, 'not_checked') = 'not_checked'
                THEN 1 ELSE 0 END AS date_recovery_eligible,
           d.job_title AS detail_title,
           COALESCE(
             CASE WHEN LOWER(TRIM(COALESCE(d.job_title, ''))) LIKE 'skip to%' THEN NULL ELSE NULLIF(TRIM(d.job_title), '') END,
             CASE WHEN LOWER(TRIM(COALESCE(r.title, ''))) LIKE 'skip to%' THEN NULL ELSE NULLIF(TRIM(r.title), '') END
           ) AS display_title,
           COALESCE(NULLIF(TRIM(r.application_url), ''), NULLIF(TRIM(r.url), ''), NULLIF(TRIM(j.url), '')) AS public_url
    FROM jobs j
    JOIN raw_jobs r ON r.id = j.id
    JOIN job_details d ON d.id = j.id
    WHERE j.is_active = 1
      AND COALESCE(NULLIF(TRIM(r.application_url), ''), NULLIF(TRIM(r.url), ''), NULLIF(TRIM(j.url), '')) IS NOT NULL
      AND (
        LOWER(TRIM(COALESCE(d.job_title, ''))) LIKE 'skip to%'
        OR NULLIF(TRIM(d.job_title), '') IS NULL
        OR ((d.closing_date IS NULL OR TRIM(d.closing_date) = '')
          AND (r.pending_closing_date IS NULL OR TRIM(r.pending_closing_date) = '')
          AND COALESCE(r.pending_closing_date_status, 'not_checked') = 'not_checked')
      )
    ORDER BY j.public_id
  `);

  const today = new Date().toISOString().slice(0, 10);
  const rows = (result.rows as unknown as Row[]).map(row => {
    const sourceTitle = extractRawJobTitle(row.source, row.raw_text);
    const urlTitle = extractUrlJobTitle(String(row.public_url ?? ''), row.raw_text);
    return {
      ...row,
      url_title: urlTitle || null,
      display_title: row.display_title || sourceTitle || urlTitle || null,
    };
  });
  const titleFixes = rows.filter(row => !isUsableJobTitle(row.detail_title) && isUsableJobTitle(row.display_title));
  const candidates: Array<Row & {
    closingDate: string | null;
    closingStatus: 'known' | 'open_until_filled';
  }> = rows.flatMap(row => {
    if (row.date_recovery_eligible !== 1) return [];
    const closing = normalizeActiveClosingDateStatus(String(row.raw_text ?? ''));
    if (closing.status === 'open_until_filled') {
      return [{ ...row, closingDate: null, closingStatus: 'open_until_filled' as const }];
    }
    if (!closing.date || closing.date < today) return [];
    return [{ ...row, closingDate: closing.date, closingStatus: 'known' as const }];
  }).slice(0, LIMIT);

  console.log(`[Hidden deadline backfill] ${APPLY ? 'Applying' : 'Dry run'}: ${candidates.length}/${LIMIT} pending metadata candidate(s), ${titleFixes.length} title fix(es), today=${today}.`);
  for (const row of candidates) {
    console.log(JSON.stringify({
      public_id: row.public_id,
      source: row.source,
      title: row.display_title,
      url: row.public_url,
      closing_date: row.closingDate,
      closing_status: row.closingStatus,
      evidence: extractEvidence(String(row.raw_text ?? '')),
    }));
  }

  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to write.');
    return;
  }
  if (titleFixes.length === 0 && candidates.length === 0) return;

  await db.batch([
    ...titleFixes.flatMap(row => {
      const before = JSON.stringify({ job_title: row.detail_title });
      const after = JSON.stringify({ job_title: row.display_title });
      const note = row.url_title
        ? 'Recovered source title from a validated human-readable URL slug during pending metadata recovery'
        : 'Recovered source title from captured source text during pending metadata recovery';
      return [
      {
        sql: `INSERT INTO manual_review_changes (job_id, note, before_json, after_json)
              VALUES (?, ?, ?, ?)`,
        args: [row.id, note, before, after],
      },
      {
        sql: `UPDATE raw_jobs SET title = ? WHERE id = ?
              AND (title IS NULL OR TRIM(title) = '' OR LOWER(TRIM(title)) LIKE 'skip to%')`,
        args: [row.display_title, row.id],
      },
      {
        sql: `UPDATE job_details SET job_title = ? WHERE id = ?
              AND (job_title IS NULL OR TRIM(job_title) = '' OR LOWER(TRIM(job_title)) LIKE 'skip to%')`,
        args: [row.display_title, row.id],
      },
      ];
    }),
    ...candidates.flatMap(row => {
      const before = JSON.stringify({
        pending_closing_date: row.pending_closing_date,
        pending_closing_date_status: row.pending_closing_date_status,
        parsed_at: row.parsed_at,
        verified_at: row.verified_at,
        closing_date: row.closing_date,
      });
      const after = JSON.stringify({
        pending_closing_date: row.closingDate,
        pending_closing_date_status: row.closingStatus,
        parsed_at: null,
        verified_at: null,
        closing_date: row.closing_date,
      });
      return [
        {
          sql: `INSERT INTO manual_review_changes (job_id, note, before_json, after_json)
                VALUES (?, ?, ?, ?)`,
          args: [row.id, row.closingStatus === 'open_until_filled'
            ? 'Recovered explicit Open Until Filled status and re-queued for pending-details visibility'
            : 'Recovered source-backed application deadline and re-queued for pending-details visibility', before, after],
        },
        {
          sql: `UPDATE raw_jobs
                SET pending_closing_date = ?, pending_closing_date_status = ?, parsed_at = NULL
                WHERE id = ?
                  AND (pending_closing_date IS NULL OR TRIM(pending_closing_date) = '')
                  AND COALESCE(pending_closing_date_status, 'not_checked') = 'not_checked'`,
          args: [row.closingDate, row.closingStatus, row.id],
        },
        {
          sql: `UPDATE jobs SET verified_at = NULL WHERE id = ? AND is_active = 1`,
          args: [row.id],
        },
      ];
    }),
  ], 'write');

  if (candidates.length === 0) {
    console.log(`[Hidden deadline backfill] Applied and verified ${titleFixes.length} title fix(es).`);
    return;
  }

  const ids = candidates.map(row => row.id);
  const verification = await db.execute({
    sql: `SELECT COUNT(*) AS count
          FROM jobs j
          JOIN raw_jobs r ON r.id = j.id
          WHERE j.is_active = 1
            AND j.id IN (${ids.map(() => '?').join(',')})
            AND (
              (r.pending_closing_date_status = 'known' AND r.pending_closing_date IS NOT NULL)
              OR r.pending_closing_date_status = 'open_until_filled'
            )
            AND r.parsed_at IS NULL`,
    args: ids,
  });
  const verified = Number(verification.rows[0]?.count ?? 0);
  if (verified !== candidates.length) throw new Error(`Verification failed: ${verified}/${candidates.length} rows are pending with recovered metadata.`);
  console.log(`[Hidden deadline backfill] Applied and verified ${verified}/${candidates.length} row(s).`);
}

main().catch(error => {
  console.error('[Hidden deadline backfill] Failed:', error);
  process.exitCode = 1;
});
