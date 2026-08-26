/**
 * Discover repeated body text that may be employer or portal boilerplate.
 * This is intentionally report-only: repeated text still requires review
 * before a source or engine cleanup rule is added.
 *
 *   npx tsx audit-description-boilerplate.ts
 */
import dotenv from 'dotenv';
import { initDb } from './db';

dotenv.config({ quiet: true });

type Row = { id: string; source: string; description: string; store: 'current' | 'archive' };
type Candidate = { source: string; count: number; total: number; stores: string[]; ids: string[]; text: string };

const MIN_LENGTH = 90;
const MAX_LENGTH = 900;
const MIN_COUNT = 3;
const BOILERPLATE_SIGNAL = /cookie|privacy|workday|work hub|job hub|read more|follow us|only (?:those|candidates)|thank all|accommodation|accessib|equity|divers|employer|recruitment|apply|legally entitled|traditional territor|human resources|career process|workplace|indigenous|inclusion|barrier[- ]free|hiring process/i;

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function units(description: string): string[] {
  const flattened = description.replace(/\r/g, '').replace(/\n+/g, ' ');
  return flattened
    .split(/(?<=[.!?])\s+/)
    .map(value => value.replace(/^[-•*#\s]+/, '').trim())
    .filter(value => value.length >= MIN_LENGTH && value.length <= MAX_LENGTH);
}

async function main() {
  const db = await initDb() as any;
  const query = {
    sql: `SELECT j.id, j.source, d.description
          FROM jobs j JOIN job_details d ON d.id = j.id
          WHERE d.description IS NOT NULL AND TRIM(d.description) <> ''`,
    args: [],
  };
  const rows: Row[] = [
    ...(await db.execute(query)).rows.map((row: any) => ({ ...row, store: 'current' as const })),
    ...(typeof db.executeArchive === 'function'
      ? (await db.executeArchive(query)).rows.map((row: any) => ({ ...row, store: 'archive' as const }))
      : []),
  ];
  const sourceTotals = new Map<string, number>();
  const grouped = new Map<string, Map<string, { count: number; ids: string[]; stores: Set<string> }>>();
  for (const row of rows) {
    sourceTotals.set(row.source, (sourceTotals.get(row.source) ?? 0) + 1);
    const source = grouped.get(row.source) ?? new Map();
    grouped.set(row.source, source);
    const seen = new Set<string>();
    for (const unit of units(row.description)) {
      const text = normalize(unit);
      if (seen.has(text)) continue;
      seen.add(text);
      const entry = source.get(text) ?? { count: 0, ids: [], stores: new Set<string>() };
      entry.count += 1;
      if (entry.ids.length < 5) entry.ids.push(row.id);
      entry.stores.add(row.store);
      source.set(text, entry);
    }
  }
  const candidates: Candidate[] = [];
  for (const [source, entries] of grouped) {
    const total = sourceTotals.get(source) ?? 0;
    for (const [text, entry] of entries) {
      if (entry.count < MIN_COUNT || !BOILERPLATE_SIGNAL.test(text)) continue;
      if (entry.count < 10 && entry.count / total < 0.15) continue;
      candidates.push({ source, count: entry.count, total, stores: [...entry.stores], ids: entry.ids, text });
    }
  }
  candidates.sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
  console.log(JSON.stringify({ scanned: rows.length, candidates: candidates.length, results: candidates.slice(0, 500) }, null, 2));
}

main().catch(error => {
  console.error('[Description boilerplate audit] Failed:', error);
  process.exitCode = 1;
});
