import { initDb } from './db';
import {
  extractEducationRequirements,
  extractLanguageVehicleRequirements,
  extractLicenseRequirements,
  extractNamedBenefits,
  extractSoftwareRequirements,
} from './requirements';

type IndexRow = { id: string; source: string };
type Row = IndexRow & {
  job_title: string;
  description: string;
  url: string;
  raw_url: string;
  application_url: string;
  raw_text: string;
  location: string;
  work_model: string;
  employment_type: string;
  closing_date: string;
  posted_at: string;
  education_requirements: string | null;
  license_requirements: string | null;
  benefits: string | null;
  required_skills: string | null;
  software_requirements: string | null;
  language_requirements: string | null;
  vehicle_required: number | null;
};

type Field = 'education' | 'license' | 'benefits' | 'software' | 'language' | 'vehicle';

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function list(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string' && item.trim()) : [];
  } catch {
    return [];
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function sameValues(left: string[], right: string[]): boolean {
  const clean = (values: string[]) => [...new Set(values.map(normalize))].sort();
  return JSON.stringify(clean(left)) === JSON.stringify(clean(right));
}

function quotaBySource(rows: IndexRow[], target: number): Map<string, number> {
  const groups = new Map<string, IndexRow[]>();
  for (const row of rows) groups.set(row.source, [...(groups.get(row.source) ?? []), row]);

  const quotas = new Map<string, number>();
  const remainders: Array<{ source: string; remainder: number }> = [];
  let assigned = 0;
  for (const [source, group] of groups) {
    const exact = group.length / rows.length * target;
    const base = Math.min(group.length, Math.max(1, Math.floor(exact)));
    quotas.set(source, base);
    assigned += base;
    remainders.push({ source, remainder: exact - Math.floor(exact) });
  }

  const ordered = [...remainders].sort((a, b) => b.remainder - a.remainder);
  while (assigned < target) {
    let changed = false;
    for (const { source } of ordered) {
      const group = groups.get(source)!;
      if ((quotas.get(source) ?? 0) < group.length) {
        quotas.set(source, quotas.get(source)! + 1);
        assigned++;
        changed = true;
        if (assigned === target) break;
      }
    }
    if (!changed) break;
  }
  if (assigned > target) {
    const reduceOrder = [...remainders].sort((a, b) => a.remainder - b.remainder);
    while (assigned > target) {
      let changed = false;
      for (const { source } of reduceOrder) {
        if ((quotas.get(source) ?? 0) > 1) {
          quotas.set(source, quotas.get(source)! - 1);
          assigned--;
          changed = true;
          if (assigned === target) break;
        }
      }
      if (!changed) break;
    }
  }
  return quotas;
}

function storedValues(row: Row, field: Field): string[] | number | null {
  if (field === 'education') return list(row.education_requirements);
  if (field === 'license') return list(row.license_requirements);
  if (field === 'benefits') return list(row.benefits);
  if (field === 'software') return list(row.software_requirements);
  if (field === 'language') return list(row.language_requirements);
  return row.vehicle_required;
}

function extractedValues(row: Row, field: Field, text: string): string[] | boolean | null {
  if (field === 'education') return extractEducationRequirements(text);
  if (field === 'license') return extractLicenseRequirements(text);
  if (field === 'benefits') return extractNamedBenefits(text);
  if (field === 'software') return extractSoftwareRequirements(text).values;
  if (field === 'language') return extractLanguageVehicleRequirements(text, row.job_title).language_requirements;
  return extractLanguageVehicleRequirements(text, row.job_title).vehicle_required;
}

function sourceBalancedSample(rows: IndexRow[], target: number): IndexRow[] {
  const quotas = quotaBySource(rows, target);
  const groups = new Map<string, IndexRow[]>();
  for (const row of rows) groups.set(row.source, [...(groups.get(row.source) ?? []), row]);
  return [...groups.entries()].flatMap(([source, group]) =>
    group.sort((a, b) => stableHash(a.id) - stableHash(b.id)).slice(0, quotas.get(source) ?? 0)
  );
}

function addExample(examples: Record<string, Array<Record<string, unknown>>>, key: string, row: Row, detail?: unknown): void {
  if (examples[key].length >= 8) return;
  examples[key].push({ id: row.id, source: row.source, title: row.job_title, ...(detail === undefined ? {} : { detail }) });
}

async function main() {
  const db = await initDb();
  const indexResult = await db.execute(`
    SELECT j.id, j.source
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    ORDER BY j.source, j.id
  `);
  const indexRows: IndexRow[] = indexResult.rows.map(row => ({ id: String(row.id), source: String(row.source) }));
  const target = Math.ceil(indexRows.length * 0.02);
  const selected = sourceBalancedSample(indexRows, target);
  const placeholders = selected.map(() => '?').join(',');
  const detailResult = await db.execute(`
    SELECT j.id, j.source, j.url,
           jd.job_title, jd.description, jd.location, jd.work_model, jd.employment_type,
           jd.closing_date, jd.education_requirements, jd.license_requirements,
           jd.benefits, jd.required_skills, jd.software_requirements,
           jd.language_requirements, jd.vehicle_required, jd.posted_at,
           COALESCE(raw.url, '') AS raw_url, COALESCE(raw.application_url, '') AS application_url,
           COALESCE(raw.raw_text, '') AS raw_text
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    LEFT JOIN raw_jobs raw ON raw.id = j.id
    WHERE j.id IN (${placeholders})
  `, selected.map(row => row.id));
  const rows: Row[] = detailResult.rows.map(row => ({
    id: String(row.id),
    source: String(row.source),
    job_title: String(row.job_title ?? ''),
    description: String(row.description ?? ''),
    url: String(row.url ?? ''),
    raw_url: String(row.raw_url ?? ''),
    application_url: String(row.application_url ?? ''),
    raw_text: String(row.raw_text ?? ''),
    location: String(row.location ?? ''),
    work_model: String(row.work_model ?? ''),
    employment_type: String(row.employment_type ?? ''),
    closing_date: String(row.closing_date ?? ''),
    posted_at: String(row.posted_at ?? ''),
    education_requirements: row.education_requirements as string | null,
    license_requirements: row.license_requirements as string | null,
    benefits: row.benefits as string | null,
    required_skills: row.required_skills as string | null,
    software_requirements: row.software_requirements as string | null,
    language_requirements: row.language_requirements as string | null,
    vehicle_required: row.vehicle_required === null || row.vehicle_required === undefined ? null : Number(row.vehicle_required),
  }));

  const fields: Field[] = ['education', 'license', 'benefits', 'software', 'language', 'vehicle'];
  const counts: Record<string, number> = {
    emptyDescription: 0,
    shortDescriptionUnder250: 0,
    longDescriptionOver8000: 0,
    genericOrPortalUrl: 0,
    missingUrl: 0,
    repeatedParagraphs: 0,
    remainingBoilerplate: 0,
    missingLocation: 0,
    missingWorkModel: 0,
    missingEmploymentType: 0,
    missingClosingDate: 0,
    missingPostedDate: 0,
    missingStructuredValues: 0,
    mismatchedStructuredValues: 0,
  };
  const examples: Record<string, Array<Record<string, unknown>>> = Object.fromEntries([
    'emptyDescription', 'shortDescriptionUnder250', 'longDescriptionOver8000', 'genericOrPortalUrl',
    'missingUrl', 'repeatedParagraphs', 'remainingBoilerplate', 'missingLocation', 'missingWorkModel',
    'missingEmploymentType', 'missingClosingDate', 'missingPostedDate', 'missingStructuredValues',
    'mismatchedStructuredValues',
  ].map(key => [key, []]));
  const structuredMissing: Record<Field, number> = Object.fromEntries(fields.map(field => [field, 0])) as Record<Field, number>;
  const structuredMismatch: Record<Field, number> = Object.fromEntries(fields.map(field => [field, 0])) as Record<Field, number>;
  const genericUrl = /(?:\/search(?:[/?]|$)|\/jobsearch(?:[/?]|$)|\/careersection\/.*jobsearch|\/default(?:[/?]|$)|\/candidateexperience\/(?:en\/)?sites\/[^/]+\/?$|\/go\/all-jobs\/?$)/i;
  const boilerplate = /(?:find us on (?:instagram|facebook|linkedin)|learn more about our recruitment process|skip to main content|cookie(?: policy| notice)|don[’']t meet every requirement|break through at brock|at the university of waterloo, we create and promote a culture)/i;

  for (const row of rows) {
    const description = row.description.trim();
    const url = row.url.trim() || row.application_url.trim() || row.raw_url.trim();
    const paragraphs = description.split(/\n\s*\n+/).map(normalize).filter(Boolean);
    const repeated = paragraphs.filter((paragraph, index) => paragraphs.indexOf(paragraph) !== index).length;
    const flags: string[] = [];
    const flag = (key: string, detail?: unknown) => {
      counts[key]++;
      flags.push(key);
      addExample(examples, key, row, detail);
    };
    if (!description) flag('emptyDescription');
    else if (description.length < 250) flag('shortDescriptionUnder250', description.length);
    if (description.length > 8000) flag('longDescriptionOver8000', description.length);
    if (!url) flag('missingUrl');
    else if (genericUrl.test(url) && !/[?&](?:jobid|jobId)=/i.test(url)) flag('genericOrPortalUrl', url);
    if (repeated > 0) flag('repeatedParagraphs', repeated);
    if (boilerplate.test(description)) flag('remainingBoilerplate');
    if (!row.location.trim()) flag('missingLocation');
    if (!row.work_model.trim()) flag('missingWorkModel');
    if (!row.employment_type.trim()) flag('missingEmploymentType');
    if (!row.closing_date.trim()) flag('missingClosingDate');
    if (!row.posted_at.trim()) flag('missingPostedDate');

    const sourceText = `${row.raw_text}\n${description}`;
    for (const field of fields) {
      const extracted = extractedValues(row, field, sourceText);
      const stored = storedValues(row, field);
      const extractedEmpty = field === 'vehicle' ? extracted === null : (extracted as string[]).length === 0;
      const storedEmpty = field === 'vehicle' ? stored === null : (stored as string[]).length === 0;
      if (extractedEmpty) continue;
      if (storedEmpty) {
        structuredMissing[field]++;
        flag('missingStructuredValues', { field, extracted });
      } else if (field !== 'vehicle' && !sameValues(extracted as string[], stored as string[])) {
        structuredMismatch[field]++;
        flag('mismatchedStructuredValues', { field, extracted, stored });
      }
    }
    void flags;
  }

  for (const field of fields) {
    counts[`missing_${field}`] = structuredMissing[field];
    counts[`mismatched_${field}`] = structuredMismatch[field];
  }
  console.log(JSON.stringify({
    method: 'stable source-balanced 2% sample',
    total: indexRows.length,
    target,
    sample: rows.length,
    sourceCount: new Set(rows.map(row => row.source)).size,
    sourceCounts: rows.reduce<Record<string, number>>((result, row) => ({ ...result, [row.source]: (result[row.source] ?? 0) + 1 }), {}),
    counts,
    examples,
    selectedIds: rows.map(row => row.id).sort(),
  }, null, 2));
}

main().catch(error => {
  console.error('[Holistic sample audit] Failed:', error);
  process.exitCode = 1;
});
