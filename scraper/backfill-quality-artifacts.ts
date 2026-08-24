/** Repair archived scalar captures with deterministic source-backed values.
 *
 *   npx tsx backfill-quality-artifacts.ts
 *   npx tsx backfill-quality-artifacts.ts --apply
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { extractBoardSpecificMetadata } from './board-parsers';
import { normalizeLocation } from './location';
import { normalizeDepartment, normalizeUnionName } from './validate';
import { isUsableJobTitle, normalizeSourceJobTitle } from './title';

dotenv.config({ quiet: true });
const APPLY = process.argv.includes('--apply');

type Row = Record<string, unknown> & { store: 'current' | 'archive' };
type Change = { id: string; source: string; store: Row['store']; fields: Record<string, string | null> };

const QUERY = `
  SELECT r.id, r.source, r.title AS raw_title, r.raw_text,
         d.job_title, d.hours, d.location, d.union_name, d.department
  FROM raw_jobs r
  LEFT JOIN job_details d ON d.id = r.id
`;

function text(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function changesFor(row: Row): Change | null {
  const source = text(row.source);
  const fields: Record<string, string | null> = {};
  const rawTitle = text(row.raw_title);
  const detailTitle = text(row.job_title);

  // These two portals stored a clean source title beside a page-wide title
  // capture. Prefer the preserved source title; never invent a replacement.
  if ((source === 'Town of Ajax' || source === 'Ontario Tech University')
    && isUsableJobTitle(rawTitle)
    && /cookies|#BeTheReason|Healthy\s*&\s*Safe\s+Communities|Contribute\s+to\s+the\s+City\s+of\s+Hamilton/i.test(detailTitle)) {
    fields.job_title = normalizeSourceJobTitle(source, rawTitle);
  }

  // Algonquin Workday captures glued Anticipated Start Date onto the weekly
  // hours value. The numeric prefix is the labelled Scheduled Weekly Hours.
  if (source === 'Algonquin College') {
    const match = text(row.hours).match(/^(\d+(?:\.\d+)?)Anticipated\s+Start\s+Date:/i);
    if (match) fields.hours = Number(match[1]) > 0 ? `${match[1]} hours per week` : null;
  }
  if (source === 'City of Vancouver' && /^Full-time\s+hours?:\s*\d{1,2}:\d{2}/i.test(text(row.hours))) {
    fields.hours = null;
  }

  // City of Toronto's glued Number of Positions label is not a bargaining
  // unit. The parser now stops before that label; clean the stored artifact.
  if (source === 'City of Toronto' && /^Non-Union\s*Number\s+of\s+Positions?/i.test(text(row.union_name))) {
    fields.union_name = null;
  }
  if (source === 'City of Toronto' && text(row.union_name) && !normalizeUnionName(text(row.union_name))) {
    fields.union_name = null;
  }

  if (source === 'Fanshawe College') {
    const match = text(row.hours).match(/per\s+Week\s*:\s*(\d+(?:\.\d+)?)/i);
    if (match) fields.hours = `${match[1]} hours per week`;
  }

  if (source === 'BC Public Service' && text(row.department) === 'Water,Land,ResourceStewardship') {
    fields.department = normalizeDepartment(text(row.department));
  }

  // This is a labelled prose capture, not a usable location. Empty is safer
  // than displaying `Locations: Various Lock Stations...` as a city.
  if (source === 'Government of Canada' && /^Locations?:\s*Various\s+Lock\s+Stations?/i.test(text(row.location))) {
    fields.location = null;
  }

  if (source === 'UBC' && /Receives\s+Direction\s+From|Keeps\s+Manager/i.test(text(row.location))) {
    const parsed = extractBoardSpecificMetadata(source, text(row.raw_text));
    const recovered = normalizeLocation(parsed.location ?? '');
    fields.location = recovered || null;
  }

  if (!Object.keys(fields).length) return null;
  return { id: text(row.id), source, store: row.store, fields };
}

async function main() {
  const db = await initDb() as any;
  const archive = db as any;
  const stores: Array<{ label: Row['store']; read: (statement: string) => Promise<{ rows: Row[] }>; write: (statements: Array<{ sql: string; args: unknown[] }>) => Promise<unknown> }> = [
    { label: 'current', read: statement => db.execute(statement), write: statements => db.batch(statements, 'write') },
  ];
  if (archive.executeArchive && archive.batchArchive) {
    stores.push({ label: 'archive', read: statement => archive.executeArchive(statement), write: statements => archive.batchArchive(statements) });
  }

  for (const store of stores) {
    const rows = (await store.read(QUERY)).rows.map(row => ({ ...row, store: store.label }));
    const changes = rows.map(changesFor).filter(Boolean) as Change[];
    console.log(`[Quality artifacts:${store.label}] ${APPLY ? 'Applying' : 'Dry run'}: ${changes.length} row(s).`);
    for (const change of changes.slice(0, 30)) console.log(JSON.stringify(change));
    if (!APPLY) continue;
    const statements = changes.map(change => {
      const columns = Object.keys(change.fields);
      return {
        sql: `UPDATE job_details SET ${columns.map(column => `${column} = ?`).join(', ')} WHERE id = ?`,
        args: [...columns.map(column => change.fields[column]), change.id],
      };
    });
    if (statements.length) await store.write(statements);
  }
}

main().catch(error => { console.error('[Quality artifacts] Failed:', error); process.exitCode = 1; });
