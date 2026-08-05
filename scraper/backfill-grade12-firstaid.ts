/**
 * Fill education (Grade 12 → High school diploma) and certification
 * (First Aid / CPR) from Qualifications body, then strip those restatement
 * bullets from the description.
 *
 *   npx tsx backfill-grade12-firstaid.ts           # dry-run
 *   npx tsx backfill-grade12-firstaid.ts --apply
 *   npx tsx backfill-grade12-firstaid.ts --active-only
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import {
  extractCertificationRequirements,
  extractEducationRequirements,
  normalizeEducationRequirements,
  stripStructuredQualBullets,
} from './requirements';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const ACTIVE_ONLY = process.argv.includes('--active-only');

function parseList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function mergeUnique(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map(v => v.toLowerCase()));
  const out = [...existing];
  for (const item of incoming) {
    const key = item.toLowerCase();
    if (!key || seen.has(key)) continue;
    if (/high school diploma/i.test(item) && out.some(e => /high school diploma|grade\s*12/i.test(e))) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  // Collapse overlapping First Aid labels after merge
  return dedupeCerts(out);
}

function dedupeCerts(values: string[]): string[] {
  const nonFa: string[] = [];
  const fa: string[] = [];
  for (const v of values) {
    if (/\bfirst\s+aid\b|\bcpr\b/i.test(v)) fa.push(v);
    else nonFa.push(v);
  }
  if (fa.length <= 1) return [...nonFa, ...fa];
  fa.sort((a, b) => b.length - a.length);
  return [...nonFa, fa[0]];
}

function sameList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].map(s => s.toLowerCase()).sort();
  const sb = [...b].map(s => s.toLowerCase()).sort();
  return sa.every((v, i) => v === sb[i]);
}

type Change = {
  id: string;
  source: string;
  title: string;
  is_active: number;
  eduFrom: string[];
  eduTo: string[];
  certFrom: string[];
  certTo: string[];
  descChanged: boolean;
  sampleRemoved: string[];
  after: string;
};

async function main() {
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const result = await db.execute(`
    SELECT j.id, j.source, j.is_active, d.job_title, d.description,
           d.education_requirements, d.certification_requirements
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    WHERE d.description IS NOT NULL AND d.description != ''
      ${ACTIVE_ONLY ? 'AND j.is_active = 1' : ''}
      AND (
        lower(d.description) LIKE '%grade 12%'
        OR lower(d.description) LIKE '%first aid%'
        OR lower(d.description) LIKE '%first-aid%'
        OR lower(d.description) LIKE '%cpr%'
      )
  `);

  const changes: Change[] = [];

  for (const row of result.rows) {
    const before = String(row.description ?? '');
    const eduFrom = normalizeEducationRequirements(parseList(row.education_requirements));
    const certFrom = parseList(row.certification_requirements);

    const extractedEdu = extractEducationRequirements(before);
    const extractedCert = extractCertificationRequirements(before);

    const gradeEdu = extractedEdu.filter(e =>
      /\b(?:high\s+school|grade\s*12|years of high school|secondary)\b/i.test(e),
    );
    const firstAidCert = extractedCert.filter(c => /\bfirst\s+aid\b|\bcpr\b/i.test(c));

    const eduTo = normalizeEducationRequirements(mergeUnique(eduFrom, gradeEdu));
    const certTo = mergeUnique(certFrom, firstAidCert);

    const after = stripStructuredQualBullets(before, {
      education: eduTo,
      certifications: certTo,
      licenses: [],
      experience: [],
      languages: [],
    });

    const eduChanged = !sameList(eduFrom, eduTo);
    const certChanged = !sameList(certFrom, certTo);
    const descChanged = after !== before;
    if (!eduChanged && !certChanged && !descChanged) continue;

    const beforeBullets = (before.match(/^\s*[-•*]\s+.+$/gm) || []).map(l => l.replace(/^\s*[-•*]\s+/, '').trim());
    const afterSet = new Set((after.match(/^\s*[-•*]\s+.+$/gm) || []).map(l => l.replace(/^\s*[-•*]\s+/, '').trim()));
    const sampleRemoved = beforeBullets
      .filter(b => !afterSet.has(b) && (/\bgrade\s*12\b|\bfirst[-\s]?aid\b|\bcpr\b/i.test(b)))
      .slice(0, 3);

    changes.push({
      id: String(row.id),
      source: String(row.source),
      title: String(row.job_title ?? ''),
      is_active: Number(row.is_active ?? 0),
      eduFrom,
      eduTo,
      certFrom,
      certTo,
      descChanged,
      sampleRemoved,
      after,
    });
  }

  console.log(`Candidates scanned: ${result.rows.length}`);
  console.log(`Would update: ${changes.length}${APPLY ? ' (applying)' : ' (dry-run)'}`);
  console.log(`  active: ${changes.filter(c => c.is_active === 1).length}`);
  console.log(`  edu fills: ${changes.filter(c => !sameList(c.eduFrom, c.eduTo)).length}`);
  console.log(`  cert fills: ${changes.filter(c => !sameList(c.certFrom, c.certTo)).length}`);
  console.log(`  desc strips: ${changes.filter(c => c.descChanged).length}`);

  console.log('\nSamples:');
  for (const c of changes.slice(0, 25)) {
    console.log(`- [${c.source}] ${c.title}`);
    if (!sameList(c.eduFrom, c.eduTo)) console.log(`  edu: ${JSON.stringify(c.eduFrom)} → ${JSON.stringify(c.eduTo)}`);
    if (!sameList(c.certFrom, c.certTo)) console.log(`  cert: ${JSON.stringify(c.certFrom)} → ${JSON.stringify(c.certTo)}`);
    if (c.sampleRemoved.length) console.log(`  removed: ${c.sampleRemoved.map(s => JSON.stringify(s)).join('; ')}`);
  }

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to write.');
    return;
  }

  const BATCH = 40;
  for (let i = 0; i < changes.length; i += BATCH) {
    const batch = changes.slice(i, i + BATCH);
    await db.batch(
      batch.map(c => ({
        sql: `UPDATE job_details
              SET education_requirements = ?,
                  certification_requirements = ?,
                  description = ?
              WHERE id = ?`,
        args: [
          JSON.stringify(c.eduTo),
          JSON.stringify(c.certTo),
          c.after,
          c.id,
        ],
      })),
      'write',
    );
    console.log(`  wrote ${Math.min(i + BATCH, changes.length)}/${changes.length}`);
  }
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
