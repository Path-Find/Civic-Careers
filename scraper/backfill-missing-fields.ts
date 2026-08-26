/**
 * Fill only empty structured fields from preserved raw captures.
 *
 * This is deliberately conservative: populated values are never overwritten,
 * invalid captures are skipped, and the default mode is a dry run.
 *
 *   npx tsx backfill-missing-fields.ts
 *   npx tsx backfill-missing-fields.ts --apply
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { extractBoardSpecificMetadata } from './board-parsers';
import { classifyRawCapture } from './capture-quality';
import { extractCertificationRequirements, extractLanguageVehicleRequirements, extractSecurityRequirementLabel, extractSoftwareRequirements, extractVehicleRequired, reconcileStructuredRequirements } from './requirements';
import { formatSalaryDisplay, parseSalaryText } from './salary-format';
import { normalizeDuration } from './duration';
import { normalizeLocation } from './location';
import { normalizeDepartment, normalizeEmploymentType, normalizeUnionName, normalizeWorkModel } from './validate';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const INCLUDE_STRUCTURED = process.argv.includes('--include-structured');
const REPAIR_ARTIFACTS = process.argv.includes('--repair-artifacts');
const CURRENT_ONLY = process.argv.includes('--current-only');
const SOURCE_FILTER = process.argv.find(argument => argument.startsWith('--source='))?.slice('--source='.length) ?? '';
const REQUESTED_IDS = new Set(
  (process.env.PARSE_IDS ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean),
);

type Row = Record<string, unknown> & { store: 'current' | 'archive' };
type Change = { id: string; source: string; store: Row['store']; fields: Record<string, unknown> };

const QUERY = `
  SELECT j.id, j.source, r.raw_text,
         d.job_title, d.department, d.location, d.salary_range, d.salary_min,
         d.salary_max, d.salary_period, d.employment_type, d.work_model,
         d.duration, d.hours, d.union_name, d.description, d.benefits,
         d.required_skills, d.software_requirements, d.experience_requirements,
         d.education_requirements, d.license_requirements,
         d.language_requirements, d.certification_requirements
         , d.vehicle_required, d.security_check_required
  FROM jobs j
  JOIN raw_jobs r ON r.id = j.id
  JOIN job_details d ON d.id = j.id
  WHERE r.raw_text IS NOT NULL AND TRIM(r.raw_text) <> ''
`;

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function empty(value: unknown): boolean {
  return !text(value);
}

function list(value: unknown): string[] {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string' && item.trim()) : [];
  } catch {
    return [];
  }
}

function addIfEmpty(fields: Record<string, unknown>, row: Row, field: string, value: unknown): void {
  if (!empty(row[field]) && row[field] !== null && row[field] !== undefined) return;
  if (typeof value === 'boolean') fields[field] = value ? 1 : 0;
  else if (typeof value === 'number' || text(value)) fields[field] = value;
}

function addListIfEmpty(fields: Record<string, unknown>, row: Row, field: string, values: string[]): void {
  const cleaned = [...new Set(
    values
      .map(value => String(value ?? '').replace(/\s+/g, ' ').trim())
      .filter(value => value && value.length <= 300)
      .filter(value => !/skip to main content|page is loaded|similar jobs|follow us|cookie(?: policy| notice)|posting information/i.test(value))
      .filter(value => !(value.length > 180 && /[.!?](?:\s|$)/.test(value))),
  )];
  if (list(row[field]).length === 0 && cleaned.length > 0) fields[field] = JSON.stringify(cleaned);
}

function sameList(left: string[], right: string[]): boolean {
  const normalize = (values: string[]) => JSON.stringify([...new Set(values.map(value => value.toLowerCase().replace(/\s+/g, ' ').trim()))].sort());
  return left.length > 0 && normalize(left) === normalize(right);
}

function rejectStructuredDuplicates(fields: Record<string, unknown>, row: Row): void {
  const lists = ['benefits', 'required_skills', 'software_requirements', 'experience_requirements', 'education_requirements', 'license_requirements', 'language_requirements', 'certification_requirements'];
  for (const field of lists) {
    const candidate = list(fields[field]);
    if (candidate.length === 0) continue;
    for (const other of lists) {
      if (other === field) continue;
      if (sameList(candidate, list(row[other]))) {
        delete fields[field];
        break;
      }
    }
  }
}

function corruptedBackfillValues(row: Row): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const department = text(row.department);
  const location = text(row.location);
  const hours = text(row.hours);
  if ((text(row.source) === 'Halton Region' && /(?:Division|Pay\s+Range|Job\s+Type|Work\s+Location|Employee\s+Group|Vacancy\s+Status)/i.test(department))
    || /[a-z]{3,}(?:Position Type|Employee Group|Posting Information)/i.test(department)
    || /(?:position\s+type|employee\s+group|posting\s+information)\s*:/i.test(department)) fields.department = null;
  if (/Campus[a-z]|(?:job\s+type|employment\s+tenure|posting\s+information)\s*:/i.test(location)) fields.location = null;
  if (/^FTE:\s*[\u200b\s]*(?:casual|n\/a|none)/i.test(hours)) fields.hours = null;
  return fields;
}

function candidateChanges(row: Row): Record<string, unknown> {
  const raw = text(row.raw_text);
  if (!raw || !classifyRawCapture(text(row.source), raw).valid) return {};

  const source = text(row.source);
  const parsed = extractBoardSpecificMetadata(source, raw);
  const fields: Record<string, unknown> = {};
  const department = normalizeDepartment(parsed.department);
  const location = normalizeLocation(parsed.location);
  const employmentType = parsed.employmentType ? normalizeEmploymentType(parsed.employmentType) : '';
  const workModel = parsed.workModel ? normalizeWorkModel(parsed.workModel) : '';
  const duration = normalizeDuration(parsed.duration);
  const unionName = normalizeUnionName(parsed.unionName);
  const hours = text(parsed.hours);
  if (department.length <= 150 && !/(?:position\s*type|employee\s*group|posting\s*information|department|location|salary)\s*:?/i.test(department)) addIfEmpty(fields, row, 'department', department);
  if (location.length <= 150 && !/(?:campus[a-z]|job\s*type|employment\s*tenure|posting\s*information)/i.test(location)) addIfEmpty(fields, row, 'location', location);
  addIfEmpty(fields, row, 'employment_type', employmentType);
  addIfEmpty(fields, row, 'work_model', workModel);
  addIfEmpty(fields, row, 'duration', duration);
  if (hours.length <= 200 && !/^FTE:\s*[^\w]*(?:casual|n\/a|none)/i.test(hours) && !/\b(?:department|location|salary|posting)\s*:/i.test(hours)) addIfEmpty(fields, row, 'hours', hours);
  if (unionName.length <= 150 && !/\b(?:position|posting|information|department|location|salary)\s*:/i.test(unionName)) addIfEmpty(fields, row, 'union_name', unionName);

  const salaryText = parsed.salary ?? '';
  const salary = parseSalaryText(salaryText, parsed.salaryPeriod);
  if (empty(row.salary_range) && salary) fields.salary_range = salary.display;
  if (row.salary_min == null && salary) fields.salary_min = salary.min;
  if (row.salary_max == null && salary) fields.salary_max = salary.max;
  if (empty(row.salary_period) && salary) fields.salary_period = salary.period;
  if (empty(row.salary_range) && !salary && parsed.salary && parsed.salaryMin != null && parsed.salaryMax != null && parsed.salaryPeriod) {
    fields.salary_range = formatSalaryDisplay(parsed.salaryMin, parsed.salaryMax, parsed.salaryPeriod);
  }

  // Requirement extraction is opt-in because it is substantially more
  // expensive across the historical archive. It still only populates empty
  // JSON fields and never replaces a human/AI value.
  if (INCLUDE_STRUCTURED) {
    const structuredText = text(row.description) || raw;
    const structuredFields = ['benefits', 'required_skills', 'experience_requirements', 'education_requirements', 'license_requirements', 'software_requirements', 'certification_requirements', 'language_requirements'];
    if (structuredFields.some(field => list(row[field]).length === 0) || row.vehicle_required == null || row.security_check_required == null) {
      const structured = reconcileStructuredRequirements(structuredText, {}, raw);
      addListIfEmpty(fields, row, 'benefits', structured.benefits);
      addListIfEmpty(fields, row, 'required_skills', structured.required_skills);
      addListIfEmpty(fields, row, 'experience_requirements', structured.experience_requirements);
      addListIfEmpty(fields, row, 'education_requirements', structured.education_requirements);
      addListIfEmpty(fields, row, 'license_requirements', structured.license_requirements);
      addListIfEmpty(fields, row, 'software_requirements', extractSoftwareRequirements(raw).values);
      addListIfEmpty(fields, row, 'certification_requirements', extractCertificationRequirements(raw));
      const language = extractLanguageVehicleRequirements(structuredText, text(row.job_title));
      addListIfEmpty(fields, row, 'language_requirements', language.language_requirements);
      if (row.vehicle_required == null) addIfEmpty(fields, row, 'vehicle_required', extractVehicleRequired(structuredText));
      if (row.security_check_required == null) addIfEmpty(fields, row, 'security_check_required', extractSecurityRequirementLabel(structuredText));
      rejectStructuredDuplicates(fields, row);
    }
  }
  return fields;
}

async function main() {
  const db = await initDb() as any;
  const archive = db as { executeArchive?: (statement: unknown) => Promise<{ rows: any[] }> };
  const idFilter = REQUESTED_IDS.size
    ? ` AND j.id IN (${[...REQUESTED_IDS].map(() => '?').join(',')})`
    : '';
  const sourceFilter = SOURCE_FILTER ? ' AND j.source = ?' : '';
  const queryArgs = [...(SOURCE_FILTER ? [SOURCE_FILTER] : []), ...REQUESTED_IDS];
  const filteredQuery = `${QUERY} ${sourceFilter}${idFilter}`;
  const currentRows = (await db.execute({ sql: filteredQuery, args: queryArgs })).rows.map((row: any) => ({ ...row, store: 'current' as const }));
  const archiveRows = archive.executeArchive
    && !CURRENT_ONLY
    ? (await archive.executeArchive({ sql: filteredQuery, args: queryArgs })).rows.map((row: any) => ({ ...row, store: 'archive' as const }))
    : [];
  const changes: Change[] = [];
  const repairs: Change[] = [];
  for (const row of [...currentRows, ...archiveRows] as Row[]) {
    if (REPAIR_ARTIFACTS) {
      const fields = corruptedBackfillValues(row);
      if (Object.keys(fields).length > 0) repairs.push({ id: text(row.id), source: text(row.source), store: row.store, fields });
    }
    if (REPAIR_ARTIFACTS) continue;
    const fields = candidateChanges(row);
    if (Object.keys(fields).length > 0) changes.push({ id: text(row.id), source: text(row.source), store: row.store, fields });
  }

  console.log(JSON.stringify({
    apply: APPLY,
    readOnly: !APPLY,
    includeStructured: INCLUDE_STRUCTURED,
    repairArtifacts: REPAIR_ARTIFACTS,
    rowsScanned: currentRows.length + archiveRows.length,
    candidateRows: REPAIR_ARTIFACTS ? repairs.length : changes.length,
    candidateFields: (REPAIR_ARTIFACTS ? repairs : changes).reduce<Record<string, number>>((counts, change) => {
      for (const field of Object.keys(change.fields)) counts[field] = (counts[field] ?? 0) + 1;
      return counts;
    }, {}),
    examples: (REPAIR_ARTIFACTS ? repairs : changes).slice(0, 100),
  }, null, 2));

  if (!APPLY) return;
  let updated = 0;
  for (const change of (REPAIR_ARTIFACTS ? repairs : changes)) {
    const columns = Object.keys(change.fields);
    const guarded = columns.filter(column => change.fields[column] !== null);
    const guard = guarded.length > 0
      ? ` AND ${guarded.map(column => `(${column} IS NULL OR TRIM(CAST(${column} AS TEXT)) = '')`).join(' AND ')}`
      : '';
    const sql = `UPDATE job_details SET ${columns.map(column => `${column} = ?`).join(', ')} WHERE id = ?${guard}`;
    const statement = { sql, args: [...columns.map(column => change.fields[column]), change.id] };
    if (change.store === 'archive' && archive.batchArchive) await archive.batchArchive([statement]);
    else if (change.store === 'archive' && archive.executeArchive) await archive.executeArchive(statement);
    else await db.batch([statement], 'write');
    updated++;
  }
  console.log(`Applied ${updated} row update(s); populated fields only where they were empty.`);
}

main().catch(error => {
  console.error('[Missing fields backfill] Failed:', error);
  process.exitCode = 1;
});
