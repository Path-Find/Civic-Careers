/**
 * Read-only audit of the scoped parser registry.
 *
 * It compares stored titles with the shared parser title entry point and
 * groups proposed changes by source, engine, and rule. It never writes or
 * re-scrapes anything.
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { applyParserTitleRules, parserContext, sourceEngine } from './parser-rules';

dotenv.config({ quiet: true });

type Row = {
  id: string;
  source: string;
  raw_title: string | null;
  detail_title: string | null;
  raw_text: string | null;
};

const QUERY = `
  SELECT j.id, j.source, raw.title AS raw_title, raw.raw_text,
    d.job_title AS detail_title
  FROM jobs j
  LEFT JOIN raw_jobs raw ON raw.id = j.id
  LEFT JOIN job_details d ON d.id = j.id
`;

async function main() {
  const db = await initDb();
  const result = await db.execute(QUERY);
  const counts = new Map<string, number>();
  const examples: Array<Record<string, unknown>> = [];

  for (const row of result.rows as unknown as Row[]) {
    const context = parserContext(row.source);
    const stored = row.detail_title || row.raw_title || '';
    const proposed = applyParserTitleRules(context, stored, row.raw_text);
    if (proposed.title === stored && proposed.ruleIds.length === 0) continue;
    const key = `${row.source} [${sourceEngine(row.source) ?? 'unknown engine'}] :: ${proposed.ruleIds.join(',') || 'unclassified'}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (examples.length < 100) {
      examples.push({
        id: row.id,
        source: row.source,
        engine: sourceEngine(row.source),
        before: stored,
        after: proposed.title,
        ruleIds: proposed.ruleIds,
      });
    }
  }

  console.log(JSON.stringify({
    rowsChecked: result.rows.length,
    proposedChangeGroups: Object.fromEntries(counts),
    examples,
    readOnly: true,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

