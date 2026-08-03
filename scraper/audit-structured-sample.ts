import { initDb } from './db';
import {
  extractEducationRequirements,
  extractLanguageVehicleRequirements,
  extractLicenseRequirements,
  extractNamedBenefits,
  extractSoftwareRequirements,
} from './requirements';

type Row = {
  id: string;
  source: string;
  job_title: string;
  description: string;
  raw_text: string;
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

function sameValues(left: string[], right: string[]): boolean {
  const normalize = (values: string[]) => [...new Set(values.map(value => value.toLowerCase().replace(/\s+/g, ' ').trim()))].sort();
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function quotaBySource(rows: Row[], target: number): Map<string, number> {
  const groups = new Map<string, Row[]>();
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
  if (assigned < target) {
    while (assigned < target) {
      let changed = false;
      for (const { source } of remainders.sort((a, b) => b.remainder - a.remainder)) {
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
  } else if (assigned > target) {
    while (assigned > target) {
      let changed = false;
      for (const { source } of remainders.sort((a, b) => a.remainder - b.remainder)) {
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

function valuesFor(row: Row, field: Field, text: string): string[] | boolean | null {
  if (field === 'education') return extractEducationRequirements(text);
  if (field === 'license') return extractLicenseRequirements(text);
  if (field === 'benefits') return extractNamedBenefits(text);
  if (field === 'software') return extractSoftwareRequirements(text).values;
  if (field === 'language') return extractLanguageVehicleRequirements(text, row.job_title).language_requirements;
  return extractLanguageVehicleRequirements(text, row.job_title).vehicle_required;
}

async function main() {
  const db = await initDb();
  const result = await db.execute(`
    SELECT j.id, j.source, jd.job_title, jd.description,
           COALESCE(raw.raw_text, '') AS raw_text,
           jd.education_requirements, jd.license_requirements, jd.benefits,
           jd.required_skills, jd.software_requirements, jd.language_requirements,
           jd.vehicle_required
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    LEFT JOIN raw_jobs raw ON raw.id = j.id
    ORDER BY j.source, j.id
  `);
  const rows: Row[] = result.rows.map(row => ({
    id: String(row.id),
    source: String(row.source),
    job_title: String(row.job_title ?? ''),
    description: String(row.description ?? ''),
    raw_text: String(row.raw_text ?? ''),
    education_requirements: row.education_requirements as string | null,
    license_requirements: row.license_requirements as string | null,
    benefits: row.benefits as string | null,
    required_skills: row.required_skills as string | null,
    software_requirements: row.software_requirements as string | null,
    language_requirements: row.language_requirements as string | null,
    vehicle_required: row.vehicle_required === null || row.vehicle_required === undefined ? null : Number(row.vehicle_required),
  }));
  const target = Math.ceil(rows.length * 0.02);
  const quotas = quotaBySource(rows, target);
  const sample = [...new Map([...new Map(rows.map(row => [row.source, rows.filter(candidate => candidate.source === row.source).sort((a, b) => stableHash(a.id) - stableHash(b.id))])).entries()].flatMap(([source, group]) => group.slice(0, quotas.get(source) ?? 0).map(row => [row.id, row] as const))).values()];
  const fields: Field[] = ['education', 'license', 'benefits', 'software', 'language', 'vehicle'];
  const counts = { emptyDescription: 0, rawOnlyDescription: 0, missing: Object.fromEntries(fields.map(field => [field, 0])), mismatched: Object.fromEntries(fields.map(field => [field, 0])) } as { emptyDescription: number; rawOnlyDescription: number; missing: Record<Field, number>; mismatched: Record<Field, number> };
  const examples: Record<Field, Array<Record<string, unknown>>> = Object.fromEntries(fields.map(field => [field, []])) as Record<Field, Array<Record<string, unknown>>>;
  for (const row of sample) {
    if (!row.description.trim()) counts.emptyDescription++;
    if (row.raw_text.trim() && !row.description.trim()) counts.rawOnlyDescription++;
    const sourceText = `${row.raw_text}\n${row.description}`;
    for (const field of fields) {
      const extracted = valuesFor(row, field, sourceText);
      const stored = field === 'education' ? list(row.education_requirements)
        : field === 'license' ? list(row.license_requirements)
          : field === 'benefits' ? list(row.benefits)
            : field === 'software' ? list(row.software_requirements)
              : field === 'language' ? list(row.language_requirements)
                : row.vehicle_required;
      const extractedEmpty = field === 'vehicle' ? extracted === null : (extracted as string[]).length === 0;
      const storedEmpty = field === 'vehicle' ? stored === null : (stored as string[]).length === 0;
      if (extractedEmpty) continue;
      if (storedEmpty) {
        counts.missing[field]++;
        if (examples[field].length < 8) examples[field].push({ id: row.id, source: row.source, title: row.job_title, extracted, stored });
      } else if (field !== 'vehicle' && !sameValues(extracted as string[], stored as string[])) {
        counts.mismatched[field]++;
        if (examples[field].length < 8) examples[field].push({ id: row.id, source: row.source, title: row.job_title, extracted, stored, mismatch: true });
      }
    }
  }
  const sourceCounts = sample.reduce<Record<string, number>>((counts, row) => ({ ...counts, [row.source]: (counts[row.source] ?? 0) + 1 }), {});
  console.log(JSON.stringify({ total: rows.length, sample: sample.length, sourceCount: Object.keys(sourceCounts).length, sourceCounts, counts, examples }, null, 2));
}

main().catch(error => {
  console.error('[Structured sample audit] Failed:', error);
  process.exitCode = 1;
});
