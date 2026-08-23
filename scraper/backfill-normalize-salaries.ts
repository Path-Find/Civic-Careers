/**
 * Rewrite existing salary properties into the canonical `$amount term` form.
 *
 *   npx tsx backfill-normalize-salaries.ts          # dry run
 *   npx tsx backfill-normalize-salaries.ts --apply  # current + archive
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { extractBoardSpecificMetadata } from './board-parsers';
import { formatSalaryDisplay, parseSalaryText } from './salary-format';
import { normalizeSalaryPeriod, type SalaryPeriod } from './validate';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

type Row = Record<string, unknown>;
type Change = {
  id: string;
  source: string;
  from: string;
  to: string;
  min: number | null;
  max: number | null;
  period: SalaryPeriod | null;
};

const QUERY = `
  SELECT j.id, j.source, r.raw_text, d.salary_range, d.salary_min, d.salary_max, d.salary_period
  FROM jobs j
  LEFT JOIN raw_jobs r ON r.id = j.id
  LEFT JOIN job_details d ON d.id = j.id
  WHERE (d.salary_range IS NOT NULL AND TRIM(d.salary_range) <> '')
     OR d.salary_min IS NOT NULL
     OR d.salary_max IS NOT NULL
`;

function periodFrom(value: unknown): SalaryPeriod | null {
  const text = String(value ?? '').trim();
  return text && /hour|hr|week|month|mo|year|annual|annum|flat|course|assignment|project|stipend|honorarium/i.test(text)
    ? normalizeSalaryPeriod(text)
    : null;
}

function rawSalaryCapture(rawText: string): string {
  return rawText.match(/(?:salary\s*(?:range)?|pay\s*rate?s?|hourly\s*rate|compensation)\s*[:\-]?\s*([^\n]{3,180})/i)?.[1] ?? '';
}

function resolveSalary(row: Row): { display: string; min: number | null; max: number | null; period: SalaryPeriod | null } {
  const currentMin = row.salary_min == null ? null : Number(row.salary_min);
  const currentMax = row.salary_max == null ? null : Number(row.salary_max);
  const currentPeriod = periodFrom(row.salary_period) || periodFrom(row.salary_range);
  const source = String(row.source ?? '');
  const rawText = String(row.raw_text ?? '');
  const board = extractBoardSpecificMetadata(source, rawText);
  const boardMin = board.salaryMin == null ? null : Number(board.salaryMin);
  const boardMax = board.salaryMax == null ? null : Number(board.salaryMax);
  // `salaryPeriod` defaults to yearly in several board parsers when the source
  // salary has no qualifier. Only trust a correction when the captured salary
  // text itself contains the explicit period.
  const boardPeriod = source === 'City of Winnipeg' ? periodFrom(board.salary) : null;

  // A source-specific parser may correct a stale period, but it must agree
  // with the stored bounds before it is allowed to replace them. This is what
  // repairs rows such as Winnipeg's biweekly salary that was previously
  // mislabeled yearly, without trusting a parser capture that found the wrong
  // dollar amount elsewhere in the page.
  if (Number.isFinite(currentMin) && Number.isFinite(currentMax)
    && boardMin !== null && boardMax !== null
    && boardMin === currentMin && boardMax === currentMax
    && boardPeriod) {
    return { min: currentMin, max: currentMax, period: boardPeriod, display: formatSalaryDisplay(currentMin, currentMax, boardPeriod) };
  }

  if (Number.isFinite(currentMin) || Number.isFinite(currentMax)) {
    const min = Number.isFinite(currentMin) ? currentMin : currentMax;
    const max = Number.isFinite(currentMax) ? currentMax : currentMin;
    if (min !== null && max !== null && currentPeriod) {
      return { min, max, period: currentPeriod, display: formatSalaryDisplay(min, max, currentPeriod) };
    }
  }

  if (board.salaryMin != null || board.salaryMax != null) {
    const min = board.salaryMin ?? board.salaryMax!;
    const max = board.salaryMax ?? board.salaryMin!;
    const period = periodFrom(board.salaryPeriod) || periodFrom(board.salary);
    if (period) return { min, max, period, display: formatSalaryDisplay(min, max, period) };
  }

  const parsed = parseSalaryText(String(row.salary_range ?? '')) || parseSalaryText(rawSalaryCapture(rawText));
  if (parsed) return parsed;
  return { display: '', min: null, max: null, period: null };
}

function changesFor(rows: Row[]): Change[] {
  return rows.flatMap(row => {
    const from = String(row.salary_range ?? '').trim();
    const resolved = resolveSalary(row);
    if (from === resolved.display
      && String(row.salary_min ?? '') === String(resolved.min ?? '')
      && String(row.salary_max ?? '') === String(resolved.max ?? '')
      && String(row.salary_period ?? '') === String(resolved.period ?? '')) return [];
    return [{
      id: String(row.id),
      source: String(row.source ?? ''),
      from,
      to: resolved.display,
      min: resolved.min,
      max: resolved.max,
      period: resolved.period,
    }];
  });
}

function bulkUpdate(changes: Change[]) {
  const args: unknown[] = [];
  const values = changes.map(change => {
    args.push(change.id, change.to || null, change.min, change.max, change.period);
    return '(?, ?, ?, ?, ?)';
  }).join(', ');
  return {
    sql: `UPDATE job_details AS d
      SET salary_range = v.salary_range::text,
          salary_min = v.salary_min::numeric,
          salary_max = v.salary_max::numeric,
          salary_period = v.salary_period::text
      FROM (VALUES ${values}) AS v(id, salary_range, salary_min, salary_max, salary_period)
      WHERE d.id = v.id::text`,
    args,
  };
}

async function main() {
  const db = await initDb();
  const archiveExecute = (db as unknown as { executeArchive?: (statement: string) => Promise<{ rows: Row[] }> }).executeArchive;

  const stores: Array<{
    label: string;
    read: (statement: string) => Promise<{ rows: Row[] }>;
    write: (changes: Change[]) => Promise<void>;
  }> = [{
    label: 'current',
    read: statement => db.execute(statement),
    write: async changes => {
      for (let i = 0; i < changes.length; i += 500) {
        await db.batch([bulkUpdate(changes.slice(i, i + 500))]);
      }
    },
  }];
  if (archiveExecute) {
    const archiveBatch = (db as unknown as { batchArchive: (statements: Array<{ sql: string; args: unknown[] }>) => Promise<unknown> }).batchArchive;
    stores.push({
      label: 'archive',
      read: statement => archiveExecute.call(db, statement),
      write: async changes => {
        for (let i = 0; i < changes.length; i += 500) {
          await archiveBatch.call(db, [bulkUpdate(changes.slice(i, i + 500))]);
        }
      },
    });
  }

  for (const store of stores) {
    const result = await store.read(QUERY);
    const changes = changesFor(result.rows);
    const cleared = changes.filter(change => !change.to).length;
    console.log(`[salary-normalize:${store.label}] ${APPLY ? 'Applying' : 'Dry run'}: ${changes.length} change(s), ${cleared} cleared because no clean salary was recoverable.`);
    for (const change of changes.slice(0, 60)) {
      console.log(`  ${change.source} ${change.id}: ${JSON.stringify(change.from)} → ${JSON.stringify(change.to || null)}`);
    }
    if (APPLY && changes.length) await store.write(changes);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
