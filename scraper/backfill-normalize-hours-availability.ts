/**
 * Normalize job_details.hours + availability (and split fused hours strings).
 *
 * Usage:
 *   npx tsx backfill-normalize-hours-availability.ts           # dry-run
 *   npx tsx backfill-normalize-hours-availability.ts --apply
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { normalizeHours, splitHoursAndAvailability } from './hours-availability';
import { getPublishBlockReason } from './publish-gate';
import { extractBoardSpecificMetadata } from './board-parsers';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const QUALITY_ONLY = process.argv.includes('--quality-only');

async function main() {
  const db = await initDb();

  const query = await db.execute(`
    SELECT j.id, j.source, r.raw_text, d.job_title, d.hours, d.availability, d.department,
           d.salary_range, d.location, d.union_name, d.academic_schedule,
           d.academic_workload, d.academic_office_hours
    FROM jobs j
    JOIN raw_jobs r ON r.id = j.id
    JOIN job_details d ON d.id = j.id
    WHERE (d.hours IS NOT NULL AND trim(d.hours) != '')
       OR (d.availability IS NOT NULL AND trim(d.availability) != '')
    ORDER BY j.source, j.id
  `);

  type Change = {
    id: string;
    source: string;
    fromH: string;
    toH: string;
    fromA: string;
    toA: string;
  };
  const changes: Change[] = [];

  for (const row of query.rows) {
    if (QUALITY_ONLY) {
      const reason = getPublishBlockReason({
        title: String(row.job_title ?? ''),
        department: String(row.department ?? ''),
        hours: String(row.hours ?? ''),
        salary: String(row.salary_range ?? ''),
        location: String(row.location ?? ''),
        unionName: String(row.union_name ?? ''),
        academicSchedule: String(row.academic_schedule ?? ''),
        academicWorkload: String(row.academic_workload ?? ''),
        academicOfficeHours: String(row.academic_office_hours ?? ''),
      });
      if (reason !== 'corrupted field: hours' && reason !== 'corrupted field: availability') continue;
    }
    const fromH = String(row.hours ?? '').trim();
    const fromA = String(row.availability ?? '').trim();
    const rawText = String(row.raw_text ?? '');
    const directHours = rawText.match(/\b(?:(?:up\s+to|maximum|max\.?)\s+)?\d{1,3}(?:\.\d{1,2})?\s+hours?\s*(?:per\s+week|\/\s*week|a\s+week)\b/i);
    const labelledHours = rawText.match(/(?:scheduled\s+weekly\s+hours?|weekly\s+hours?|hours?\s+of\s+work)\s*:\s*(\d{1,3}(?:\.\d{1,2})?)/i);
    const boardHours = extractBoardSpecificMetadata(String(row.source ?? ''), rawText).hours ?? '';
    // Prefer a source sentence or a board value that normalizes to a real
    // quantity. Some board parsers expose only a bare number (e.g. Workday's
    // `Scheduled Weekly Hours:8`); never let that replace a valid existing
    // canonical value with an empty string.
    const recoveredHours = directHours
      ? normalizeHours(directHours[0])
      : labelledHours
        ? labelledHours[1] === '0' ? '' : `${labelledHours[1]} hours per week`
        : normalizeHours(boardHours);
    const { hours: toH, availability: toA } = splitHoursAndAvailability(recoveredHours || fromH, fromA);
    if (toH === fromH && toA === fromA) continue;
    changes.push({
      id: String(row.id),
      source: String(row.source),
      fromH,
      toH,
      fromA,
      toA,
    });
  }

  console.log(`[hours-availability] Scanned ${query.rows.length} row(s) with hours and/or availability${QUALITY_ONLY ? ' (quality failures only)' : ''}.`);
  console.log(`[hours-availability] Would change: ${changes.length}${APPLY ? ' (applying)' : ' (dry-run)'}.`);
  for (const c of changes) {
    console.log(
      `  ${c.source} ${c.id}\n    hours: ${JSON.stringify(c.fromH)} → ${JSON.stringify(c.toH)}\n    avail: ${JSON.stringify(c.fromA)} → ${JSON.stringify(c.toA)}`,
    );
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  for (const c of changes) {
    await db.execute({
      sql: `UPDATE job_details SET hours = ?, availability = ? WHERE id = ?`,
      args: [c.toH || null, c.toA || null, c.id],
    });
  }
  console.log(`Updated ${changes.length} row(s).`);

  const outPath = path.resolve(__dirname, '../docs/hours-availability-normalize-2026-08-04.md');
  fs.writeFileSync(
    outPath,
    [
      '# Hours / availability normalize 2026-08-04',
      '',
      `Scanned: ${query.rows.length}`,
      `Updated: ${changes.length}`,
      '',
      ...changes.map(
        (c) =>
          `- \`${c.id}\` hours \`${c.fromH}\` → \`${c.toH || '(empty)'}\`; availability \`${c.fromA}\` → \`${c.toA || '(empty)'}\``,
      ),
      '',
    ].join('\n'),
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
