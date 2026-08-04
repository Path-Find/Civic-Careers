import { initDb } from './db';
import { extractListingType, type ListingType } from './requirements';
import { EXCLUDED_GOVERNMENT_OF_CANADA_IDS, GOVERNMENT_OF_CANADA_FIXES } from './source-fixes';

const apply = process.argv.includes('--apply');
const limitArg = process.argv.find(value => value.startsWith('--limit='));
const limit = Math.max(1, Number(limitArg?.split('=')[1] || 10000));

type Row = {
  id: string;
  source: string;
  job_title: string;
  description: string;
  raw_text: string;
  is_inventory: number;
  listing_type: string | null;
  url: string;
  is_student: number;
  education_requirements: string | null;
  security_check_required: number | null;
  is_active: number;
};

type Work = Row & {
  listing_type_next: ListingType;
  is_inventory_next: number;
  url_next: string;
  description_next: string;
  is_student_next: number;
  education_requirements_next: string | null;
  security_check_required_next: number | null;
  is_active_next: number;
};

async function main() {
  const db = await initDb();
  const result = await db.execute(`
    SELECT j.id, j.source, j.url, j.is_active, jd.job_title, jd.description, jd.is_inventory,
           jd.listing_type, jd.is_student, jd.education_requirements,
           jd.security_check_required, COALESCE(raw.raw_text, '') AS raw_text
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    LEFT JOIN raw_jobs raw ON raw.id = j.id
    WHERE jd.description IS NOT NULL OR raw.raw_text IS NOT NULL
    ORDER BY j.source, j.id
  `);

  const rows: Row[] = result.rows.map(row => ({
    id: String(row.id),
    source: String(row.source),
    job_title: String(row.job_title ?? ''),
    description: String(row.description ?? ''),
    raw_text: String(row.raw_text ?? ''),
    is_inventory: Number(row.is_inventory ?? 0),
    listing_type: row.listing_type as string | null,
    url: String(row.url ?? ''),
    is_student: Number(row.is_student ?? 0),
    education_requirements: row.education_requirements as string | null,
    security_check_required: row.security_check_required === null || row.security_check_required === undefined ? null : Number(row.security_check_required),
    is_active: Number(row.is_active ?? 1),
  }));
  const work: Work[] = rows.map(row => ({
    ...row,
    listing_type_next: extractListingType(`${row.raw_text}\n${GOVERNMENT_OF_CANADA_FIXES[row.id]?.description ?? row.description}`, row.job_title, row.is_inventory === 1),
    is_inventory_next: row.is_inventory === 1 || extractListingType(`${row.raw_text}\n${GOVERNMENT_OF_CANADA_FIXES[row.id]?.description ?? row.description}`, row.job_title, row.is_inventory === 1) === 'inventory' ? 1 : 0,
    url_next: GOVERNMENT_OF_CANADA_FIXES[row.id]?.applicationUrl ?? row.url,
    description_next: GOVERNMENT_OF_CANADA_FIXES[row.id]?.description ?? row.description,
    is_student_next: GOVERNMENT_OF_CANADA_FIXES[row.id]?.isStudent ?? row.is_student,
    education_requirements_next: GOVERNMENT_OF_CANADA_FIXES[row.id]?.educationRequirements
      ? JSON.stringify(GOVERNMENT_OF_CANADA_FIXES[row.id]?.educationRequirements)
      : row.education_requirements,
    security_check_required_next: GOVERNMENT_OF_CANADA_FIXES[row.id]?.securityCheckRequired ?? row.security_check_required,
    is_active_next: EXCLUDED_GOVERNMENT_OF_CANADA_IDS.has(row.id) ? 0 : row.is_active,
  }));
  const candidates = work.filter(row => row.listing_type !== row.listing_type_next
    || row.is_inventory !== row.is_inventory_next
    || row.url !== row.url_next
    || row.description !== row.description_next
    || row.is_student !== row.is_student_next
    || row.education_requirements !== row.education_requirements_next
    || row.security_check_required !== row.security_check_required_next
    || row.is_active !== row.is_active_next);
  const typeCounts = candidates.reduce<Record<string, number>>((counts, row) => {
    if (row.listing_type !== row.listing_type_next) counts[row.listing_type_next] = (counts[row.listing_type_next] ?? 0) + 1;
    return counts;
  }, {});

  console.log(`[Listing type backfill] Scanned ${work.length} jobs.`);
  console.log(`[Listing type backfill] Changes available: ${candidates.length}; types ${JSON.stringify(typeCounts)}; inventory flags ${candidates.filter(row => row.is_inventory !== row.is_inventory_next).length}; URL corrections ${candidates.filter(row => row.url !== row.url_next).length}; source repairs ${candidates.filter(row => row.description !== row.description_next).length}; deactivations ${candidates.filter(row => row.is_active !== row.is_active_next).length}.`);
  for (const row of candidates.slice(0, 40)) {
    console.log(JSON.stringify({ id: row.id, source: row.source, title: row.job_title, listingType: row.listing_type_next, url: row.url_next }));
  }
  if (!apply || candidates.length === 0) return;

  await db.batch(candidates.flatMap(row => [
    {
      sql: `UPDATE job_details SET listing_type = ?, is_inventory = ?, description = ?, is_student = ?,
        education_requirements = ?, security_check_required = ? WHERE id = ?`,
      args: [row.listing_type_next, row.is_inventory_next, row.description_next, row.is_student_next,
        row.education_requirements_next, row.security_check_required_next, row.id],
    },
    { sql: 'UPDATE jobs SET is_active = ? WHERE id = ?', args: [row.is_active_next, row.id] },
    ...(row.url !== row.url_next ? [
      { sql: 'UPDATE jobs SET url = ? WHERE id = ?', args: [row.url_next, row.id] },
      { sql: 'UPDATE raw_jobs SET application_url = ? WHERE id = ?', args: [row.url_next, row.id] },
    ] : []),
  ]), 'write');
  console.log(`[Listing type backfill] Updated ${candidates.length} job(s).`);
}

main().catch(error => {
  console.error('[Listing type backfill] Failed:', error);
  process.exitCode = 1;
});
