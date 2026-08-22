/** Repair truncated professional-licence captures from the preserved description.
 *
 *   npx tsx backfill-invalid-license-fields.ts
 *   npx tsx backfill-invalid-license-fields.ts --apply
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { extractProfessionalLicenseRequirements, normalizeProfessionalLicenseRequirements } from './requirements';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

type Row = { id: string; source: string; job_title: string | null; description: string | null; raw_text: string | null; license_requirements: string | null };
type Change = Row & { next: string[] };

const QUERY = `
  SELECT j.id, j.source, d.job_title, d.description, r.raw_text, d.license_requirements
  FROM jobs j
  JOIN job_details d ON d.id = j.id
  LEFT JOIN raw_jobs r ON r.id = j.id
  WHERE d.license_requirements ILIKE '%registered with the College of E%'
`;

function parseList(value: string | null): string[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function changesFor(rows: Row[]): Change[] {
  return rows.flatMap(row => {
    const current = parseList(row.license_requirements);
    const retained = current.filter(value => !/registered with the college of e\.?$/i.test(value));
    const text = `${String(row.description ?? '')}\n${String(row.raw_text ?? '')}`;
    const abbreviatedEce = text.match(/\b(?:must be\s+)?(?:currently\s+)?registered with the College of E\.?\s*C\.?\s*E\.?\s*(?:\(\s*RECE\s*\))?/i)?.[0] ?? '';
    const recovered = abbreviatedEce
      ? extractProfessionalLicenseRequirements(`## Qualifications\n- ${abbreviatedEce}`)
      : [];
    const next = normalizeProfessionalLicenseRequirements([...retained, ...recovered]);
    if (JSON.stringify(current) === JSON.stringify(next)) return [];
    return [{ ...row, next }];
  });
}

async function main() {
  const db = await initDb() as any;
  const archive = db as { executeArchive?: (statement: string) => Promise<{ rows: Row[] }>; batchArchive?: (statements: Array<{ sql: string; args: unknown[] }>) => Promise<unknown> };
  const stores = [{
    label: 'current', read: (statement: string) => db.execute(statement),
    write: (changes: Change[]) => db.batch(changes.map(change => ({ sql: 'UPDATE job_details SET license_requirements = ? WHERE id = ?', args: [JSON.stringify(change.next), change.id] })), 'write'),
  }];
  if (archive.executeArchive && archive.batchArchive) stores.push({
    label: 'archive', read: (statement: string) => archive.executeArchive!(statement),
    write: (changes: Change[]) => archive.batchArchive!(changes.map(change => ({ sql: 'UPDATE job_details SET license_requirements = ? WHERE id = ?', args: [JSON.stringify(change.next), change.id] }))),
  });

  for (const store of stores) {
    const result = await store.read(QUERY);
    const changes = changesFor(result.rows);
    console.log(`[invalid-license:${store.label}] ${APPLY ? 'Applying' : 'Dry run'}: ${changes.length} change(s).`);
    for (const change of changes) console.log(`  ${change.source} ${change.id} ${JSON.stringify(change.job_title)}: ${JSON.stringify(change.next)}`);
    if (APPLY && changes.length) await store.write(changes);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
