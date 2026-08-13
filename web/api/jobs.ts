import type { IncomingMessage, ServerResponse } from 'node:http';
import { createArchiveDb, createDb } from './_db.js';
import { ORGANIZATION_GROUPS, organizationGroupForSlug, organizationGroupForSources } from '../src/modules/jobs/organizationMetadata.js';

const PUBLIC_CACHE = 's-maxage=86400, stale-while-revalidate=86400';
function sourceTextValue(value: unknown): string {
  return value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
}

function extractSourceAcademicCourse(value: unknown): string | null {
  const text = sourceTextValue(value);
  const match = text.match(/\b([A-Z]{2,8}-\d{3,4})\s*:\s*([^()]{2,120}?)\s*\(\s*\d+(?:\.\d+)?\s*credit/i);
  return match ? `${match[1]}: ${match[2].trim()}` : null;
}

function extractSourceAcademicSchedule(value: unknown): string | null {
  const text = sourceTextValue(value);
  const label = text.search(/(?:course|class)\s+schedule\s*:/i);
  if (label >= 0) {
    const start = text.indexOf(':', label) + 1;
    const remainder = text.slice(start).trim();
    const end = remainder.search(/\s+-\s+-?\s*(?:requirements|work hours|course (?:title|code)|posting limited to|salary|location)\s*:/i);
    const schedule = (end < 0 ? remainder : remainder.slice(0, end)).trim();
    if (schedule) return schedule;
  }
  const semester = text.match(/\(((?:Fall|Winter|Spring|Summer)\s+Semester:\s*[^)]+)\)/i)?.[1]?.trim();
  return semester || null;
}

const closingDate = `COALESCE(
  NULLIF(NULLIF(NULLIF(NULLIF(TRIM(jd.closing_date), ''), 'null'), 'NULL'), 'N/A'),
  NULLIF(NULLIF(NULLIF(NULLIF(TRIM(raw.pending_closing_date), ''), 'null'), 'NULL'), 'N/A')
)`;
const sourceText = `LOWER(COALESCE(raw.title, '') || ' ' || COALESCE(raw.raw_text, ''))`;
const effectiveEmploymentType = `COALESCE(jd.employment_type,
  CASE
    WHEN ${sourceText} LIKE '%full-time%' OR ${sourceText} LIKE '%full time%' THEN 'Full-time'
    WHEN ${sourceText} LIKE '%part-time%' OR ${sourceText} LIKE '%part time%' THEN 'Part-time'
    WHEN ${sourceText} LIKE '%temporary%' OR ${sourceText} LIKE '%contract%' THEN 'Contract'
  END)`;
const effectiveDuration = `COALESCE(jd.duration,
  CASE
    WHEN ${sourceText} LIKE '%16-week%' OR ${sourceText} LIKE '%16 week%' THEN '16 weeks'
    WHEN ${sourceText} LIKE '%up to two years%' THEN 'Training up to 2 years'
    WHEN raw.pending_duration IS NOT NULL THEN raw.pending_duration
    WHEN ${sourceText} LIKE '%fixed-term%' OR ${sourceText} LIKE '%fixed term%' THEN 'Term'
  END)`;
const effectiveListingType = `COALESCE(jd.listing_type,
  CASE
    WHEN jd.id IS NOT NULL THEN 'regular'
    WHEN ${sourceText} LIKE '%eligibility list%'
      OR ${sourceText} LIKE '%candidate inventory%'
      OR ${sourceText} LIKE '%inventory for future%'
      OR ${sourceText} LIKE '%not applying for a specific job%' THEN 'inventory'
    WHEN ${sourceText} LIKE '%hiring pool%'
      OR ${sourceText} LIKE '%candidate pool%'
      OR ${sourceText} LIKE '%talent pool%'
      OR ${sourceText} LIKE '%ongoing recruitment%'
      THEN 'ongoing_recruitment'
    ELSE 'regular'
  END)`;
const effectiveInventory = `CASE WHEN COALESCE(jd.is_inventory, 0) = 1 OR ${effectiveListingType} = 'inventory' THEN 1 ELSE 0 END`;
const closingDateStatus = `CASE
  WHEN ${closingDate} IS NOT NULL THEN 'known'
  WHEN jd.id IS NULL THEN COALESCE(raw.pending_closing_date_status, 'not_checked')
  WHEN ${sourceText} LIKE '%open until filled%'
    OR ${sourceText} LIKE '%open till filled%'
    OR ${sourceText} LIKE '%accepting applications until filled%' THEN 'open_until_filled'
  WHEN ${sourceText} LIKE '%no deadline%'
    OR ${sourceText} LIKE '%without a deadline%'
    OR ${sourceText} LIKE '%deadline not listed%' THEN 'not_listed'
  WHEN ${sourceText} LIKE '%closing date: tbd%'
    OR ${sourceText} LIKE '%closing date: n/a%'
    OR ${sourceText} LIKE '%closing date: none%' THEN 'invalid'
  ELSE 'not_checked'
END`;
const openUntilFilled = `(
  COALESCE(raw.pending_closing_date_status, '') = 'open_until_filled'
  OR ${sourceText} LIKE '%open until filled%'
  OR ${sourceText} LIKE '%open till filled%'
  OR ${sourceText} LIKE '%accepting applications until filled%'
)`;
const publicDeadline = `AND (
  (${closingDate} IS NOT NULL AND LEFT(${closingDate}, 10) >= CURRENT_DATE::text)
  OR ${openUntilFilled}
)`;

const jobColumns = `
  j.public_id AS rid, j.id, j.url, j.source, j.is_active, j.is_saved, j.first_seen_at, j.scraped_at,
  j.scraped_at AS last_checked_at,
  COALESCE(jd.job_title, raw.title) AS job_title, jd.department, COALESCE(jd.location, raw.pending_location) AS location,
  raw.url AS details_url,
  COALESCE(jd.salary_range, raw.pending_salary_text) AS salary_range,
  ${closingDate} AS closing_date, ${closingDateStatus} AS closing_date_status,
  COALESCE(jd.posted_at, raw.posted_at) AS posted_at, jd.start_date,
  ${effectiveInventory} AS is_inventory, ${effectiveListingType} AS listing_type, COALESCE(jd.is_student, raw.pending_is_student, 0) AS is_student, jd.career_stage,
  CASE WHEN jd.id IS NULL THEN 1 ELSE 0 END AS details_pending,
  jd.salary_min, jd.salary_max, jd.salary_period,
  jd.work_model, ${effectiveEmploymentType} AS employment_type, ${effectiveDuration} AS duration,
  jd.hours, jd.availability,
  jd.academic_role_type, jd.academic_course, jd.academic_workload, jd.academic_office_hours,
  jd.academic_supervisor, jd.academic_appointment_type, NULL AS academic_schedule,
  jd.is_unionized, jd.union_name, jd.benefits, jd.required_skills,
  jd.experience_requirements, jd.education_requirements, jd.license_requirements, jd.vehicle_required,
  jd.language_requirements, jd.security_check_required, jd.certification_requirements,
  jd.software_requirements, jd.medical_requirements,
  jd.responsibility_tags, jd.qualification_tags`;

const jobJoins = `
  FROM jobs j
  LEFT JOIN job_details jd ON j.id = jd.id
  LEFT JOIN raw_jobs raw ON j.id = raw.id`;

const freshnessDate = `CASE WHEN COALESCE(jd.posted_at, raw.posted_at) IS NOT NULL AND LEFT(COALESCE(jd.posted_at, raw.posted_at), 10) <= CURRENT_DATE::text THEN LEFT(COALESCE(jd.posted_at, raw.posted_at), 10)::date ELSE j.first_seen_at::date END`;
const visiblePending = `AND (jd.id IS NOT NULL OR length(trim(COALESCE(raw.title, ''))) > 0)`;

/** Match web/src/utils.ts slugify — company URLs are /companies/{slug}. */
function slugifySource(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mergeCompanyRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const bySource = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const name = String(row.name ?? '');
    const existing = bySource.get(name);
    if (!existing) {
      bySource.set(name, { ...row });
      continue;
    }
    existing.active_job_count = Number(existing.active_job_count ?? 0) + Number(row.active_job_count ?? 0);
    existing.total_job_count = Number(existing.total_job_count ?? 0) + Number(row.total_job_count ?? 0);
    existing.recent_job_count = Number(existing.recent_job_count ?? 0) + Number(row.recent_job_count ?? 0);
    for (const field of ['latest_job_added_at', 'last_checked_at']) {
      const current = String(existing[field] ?? '');
      const candidate = String(row[field] ?? '');
      if (candidate > current) existing[field] = candidate || null;
    }
  }
  return [...bySource.values()];
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const parsed = new URL(req.url!, `http://${req.headers.host}`);
  const id = parsed.searchParams.get('id');
  const ids = parsed.searchParams.get('ids');
  const jobId = parsed.searchParams.get('jobId');
  const rid = parsed.searchParams.get('rid');
  const view = parsed.searchParams.get('view');
  const sourceParam = parsed.searchParams.get('source');
  const sourceNamesParam = parsed.searchParams.get('sources');
  const sourceSlug = parsed.searchParams.get('sourceSlug');
  const limit = Math.min(Math.max(Number(parsed.searchParams.get('limit') ?? 50), 1), 100);
  const offset = Math.max(Number(parsed.searchParams.get('offset') ?? 0), 0);
  res.setHeader('Content-Type', 'application/json');

  try {
    const db = createDb();
    const archiveDb = createArchiveDb();

    if (ids) {
      const requestedIds = [...new Set(ids.split(',').map(value => value.trim()).filter(Boolean))].slice(0, 20);
      if (requestedIds.length === 0) {
        res.end(JSON.stringify([]));
        return;
      }
      const placeholders = requestedIds.map(() => '?').join(', ');
      const [currentResult, archiveResult] = await Promise.all([
        db.execute({
          sql: `SELECT ${jobColumns} ${jobJoins} WHERE j.id IN (${placeholders}) ${publicDeadline}`,
          args: requestedIds,
        }),
        archiveDb.execute({
          sql: `SELECT ${jobColumns} ${jobJoins} WHERE j.id IN (${placeholders}) ${publicDeadline}`,
          args: requestedIds,
        }),
      ]);
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify([...currentResult.rows, ...archiveResult.rows]));
      return;
    }

    if (id) {
      let result = await db.execute({
        sql: `SELECT jd.description, raw.raw_text,
                CASE WHEN jd.id IS NULL THEN 1 ELSE 0 END AS details_pending
              FROM jobs j LEFT JOIN job_details jd ON j.id = jd.id
              LEFT JOIN raw_jobs raw ON j.id = raw.id WHERE j.id = ? ${publicDeadline}`,
        args: [id]
      });
      if (result.rows.length === 0) {
        result = await archiveDb.execute({
          sql: `SELECT jd.description, raw.raw_text,
                  CASE WHEN jd.id IS NULL THEN 1 ELSE 0 END AS details_pending
                FROM jobs j LEFT JOIN job_details jd ON j.id = jd.id
                LEFT JOIN raw_jobs raw ON j.id = raw.id WHERE j.id = ? ${publicDeadline}`,
          args: [id]
        });
      }
      if (result.rows.length === 0) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Job not found' }));
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({
        description: result.rows[0].description ?? null,
        academic_course: extractSourceAcademicCourse(result.rows[0].raw_text),
        academic_schedule: extractSourceAcademicSchedule(result.rows[0].raw_text),
        details_pending: Number(result.rows[0].details_pending ?? 0),
      }));
      return;
    }

    if (jobId) {
      let result = await db.execute({
        sql: `SELECT ${jobColumns} ${jobJoins} WHERE j.id = ? ${publicDeadline}`,
        args: [jobId]
      });
      if (result.rows.length === 0) {
        result = await archiveDb.execute({
          sql: `SELECT ${jobColumns} ${jobJoins} WHERE j.id = ? ${publicDeadline}`,
          args: [jobId]
        });
      }
      // Keep both old numeric and source-key URLs working during the URL migration.
      if (result.rows.length === 0 && /^\d+$/.test(jobId)) {
        result = await db.execute({
          sql: `SELECT ${jobColumns} ${jobJoins} WHERE j.public_id = ? ${publicDeadline}`,
          args: [jobId]
        });
        if (result.rows.length === 0) {
          result = await archiveDb.execute({
            sql: `SELECT ${jobColumns} ${jobJoins} WHERE j.public_id = ? ${publicDeadline}`,
            args: [jobId]
          });
        }
      }
      if (result.rows.length === 0) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Job not found' }));
        return;
      }
      res.end(JSON.stringify(result.rows[0]));
      return;
    }

    // Legacy API clients still send rid.
    if (rid) {
      let result = await db.execute({
        sql: `SELECT ${jobColumns} ${jobJoins} WHERE j.public_id = ? ${publicDeadline}`,
        args: [rid]
      });
      if (result.rows.length === 0) {
        result = await archiveDb.execute({
          sql: `SELECT ${jobColumns} ${jobJoins} WHERE j.public_id = ? ${publicDeadline}`,
          args: [rid]
        });
      }
      if (result.rows.length === 0) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Job not found' }));
        return;
      }
      res.end(JSON.stringify(result.rows[0]));
      return;
    }

    if (view === 'home') {
      const locationParam = parsed.searchParams.get('location')?.trim() || null;
      const activeJobWhere = `
        WHERE j.is_active = 1
          ${visiblePending}
          AND ${effectiveInventory} = 0
          ${publicDeadline}`;
      const nearbyCount = locationParam
        ? db.execute({
          sql: `SELECT COUNT(*) AS nearby_count ${jobJoins}
            ${activeJobWhere}
            AND LOWER(COALESCE(jd.location, '')) LIKE LOWER(?)`,
          args: [`%${locationParam}%`],
        })
        : Promise.resolve({ rows: [] as Array<Record<string, unknown>> });
      const [recent, closingSoon, counts, nearby] = await Promise.all([
        db.execute(`SELECT * FROM (SELECT ${jobColumns}, ${freshnessDate} AS freshness_date, ROW_NUMBER() OVER (PARTITION BY j.source ORDER BY ${freshnessDate} DESC, j.first_seen_at DESC) AS source_rank ${jobJoins} ${activeJobWhere}) recent_by_source WHERE source_rank = 1 ORDER BY freshness_date DESC LIMIT 10`),
        db.execute(`SELECT ${jobColumns} ${jobJoins}
          ${activeJobWhere}
          AND ${closingDate} IS NOT NULL AND ${closingDate} != ''
          AND LEFT(${closingDate}, 10) <= ((CURRENT_DATE + INTERVAL '14 days')::date)::text
          ORDER BY LEFT(${closingDate}, 10) ASC LIMIT 10`),
        db.execute(`SELECT
          COUNT(*) AS available_job_count,
          SUM(CASE WHEN ${freshnessDate} >= (CURRENT_DATE - INTERVAL '7 days')::date THEN 1 ELSE 0 END) AS recently_added_count,
          SUM(CASE WHEN ${closingDate} IS NOT NULL AND ${closingDate} != ''
            AND LEFT(${closingDate}, 10) <= ((CURRENT_DATE + INTERVAL '14 days')::date)::text THEN 1 ELSE 0 END) AS closing_soon_count,
          MAX(j.scraped_at) AS last_checked_at
          ${jobJoins} ${activeJobWhere}`),
        nearbyCount,
      ]);
      const countRow = counts.rows[0] || {};
      res.setHeader('Cache-Control', PUBLIC_CACHE);
      res.end(JSON.stringify({
        recentJobs: recent.rows,
        closingSoonJobs: closingSoon.rows,
        availableJobCount: Number(countRow.available_job_count ?? 0),
        recentlyAddedCount: Number(countRow.recently_added_count ?? 0),
        closingSoonCount: Number(countRow.closing_soon_count ?? 0),
        nearMeCount: locationParam ? Number(nearby.rows[0]?.nearby_count ?? 0) : null,
        lastCheckedAt: countRow.last_checked_at ?? null,
      }));
      return;
    }

    if (view === 'companies') {
      const companySql = `
        SELECT
          j.source AS name,
          SUM(CASE WHEN j.is_active = 1
            ${visiblePending}
            AND ${effectiveInventory} = 0
            ${publicDeadline}
            THEN 1 ELSE 0 END) AS active_job_count,
          COUNT(*) AS total_job_count,
          SUM(CASE WHEN ${freshnessDate} >= (CURRENT_DATE - INTERVAL '7 days')::date THEN 1 ELSE 0 END) AS recent_job_count,
          MAX(${freshnessDate}) AS latest_job_added_at,
          MAX(j.scraped_at) AS last_checked_at
        ${jobJoins}
        GROUP BY j.source
        ORDER BY active_job_count DESC, name ASC`;
      const [currentCompanies, archiveCompanies] = await Promise.all([
        db.execute(companySql),
        archiveDb.execute(companySql),
      ]);
      const result = { rows: mergeCompanyRows([...currentCompanies.rows, ...archiveCompanies.rows]) };
      const rowsBySource = new Map(result.rows.map(row => [String(row.name ?? ''), row]));
      const groupedSources = new Set<string>();
      const groupedRows = ORGANIZATION_GROUPS.flatMap(group => {
        const matchingRows = group.sourceNames
          .map(source => rowsBySource.get(source))
          .filter((row): row is Record<string, unknown> => Boolean(row));
        if (matchingRows.length === 0) return [];
        group.sourceNames.forEach(source => groupedSources.add(source));
        return [{
          name: group.name,
          organizationSlug: group.slug,
          sourceNames: group.sourceNames,
          portal: group.portal,
          children: group.children,
          active_job_count: matchingRows.reduce((sum, row) => sum + Number(row.active_job_count ?? 0), 0),
          total_job_count: matchingRows.reduce((sum, row) => sum + Number(row.total_job_count ?? 0), 0),
          recent_job_count: matchingRows.reduce((sum, row) => sum + Number(row.recent_job_count ?? 0), 0),
          latest_job_added_at: matchingRows.map(row => String(row.latest_job_added_at ?? '')).sort().at(-1) || null,
          last_checked_at: matchingRows.map(row => String(row.last_checked_at ?? '')).sort().at(-1) || null,
        }];
      });
      const standaloneRows = result.rows
        .filter(row => !groupedSources.has(String(row.name ?? '')))
        .map(row => ({
          ...row,
          organizationSlug: slugifySource(String(row.name ?? '')),
          sourceNames: [String(row.name ?? '')],
          portal: null,
          children: [],
        }));
      res.setHeader('Cache-Control', PUBLIC_CACHE);
      res.end(JSON.stringify([...groupedRows, ...standaloneRows]));
      return;
    }

    if (view === 'jobs') {
      let sourceFilters = sourceParam ? [sourceParam] : [];
      let sourceGroup = sourceParam ? organizationGroupForSources([sourceParam]) : null;
      if (sourceGroup) sourceFilters = sourceGroup.sourceNames;

      if (sourceNamesParam) {
        sourceFilters = [...new Set(sourceNamesParam.split(',').flatMap(value => {
          // Some clients serialize spaces as literal plus signs in a query value.
          const trimmed = value.trim().replace(/\+/g, ' ');
          const group = ORGANIZATION_GROUPS.find(candidate => candidate.name === trimmed);
          return group ? group.sourceNames : trimmed ? [trimmed] : [];
        }))];
        sourceGroup = organizationGroupForSources(sourceFilters);
      }

      // Company pages: /companies/university-of-ottawa → sourceSlug=university-of-ottawa
      if (sourceSlug) {
        sourceGroup = organizationGroupForSlug(sourceSlug);
        if (sourceGroup) {
          sourceFilters = sourceGroup.sourceNames;
        } else {
          let sources = await db.execute('SELECT DISTINCT j.source AS source FROM jobs j');
          let match = sources.rows.find(row => slugifySource(String(row.source ?? '')) === sourceSlug);
          if (!match) {
            sources = await archiveDb.execute('SELECT DISTINCT j.source AS source FROM jobs j');
            match = sources.rows.find(row => slugifySource(String(row.source ?? '')) === sourceSlug);
          }
          sourceFilters = match?.source != null ? [String(match.source)] : [];
          sourceGroup = organizationGroupForSources(sourceFilters);
          if (sourceGroup) sourceFilters = sourceGroup.sourceNames;
        }
        if (sourceFilters.length === 0) {
          res.setHeader('Cache-Control', PUBLIC_CACHE);
          res.end(JSON.stringify({ jobs: [], total: 0, availableTotal: 0, source: null, sources: [], organization: null }));
          return;
        }
      }

      // Server-side list filters (must match web/src/modules/jobs/hooks/useJobFilters.ts).
      // Without these, the UI only counted matches in the first loaded page(s).
      const deadlineRaw = parsed.searchParams.get('deadlineDays');
      const deadlineDays = deadlineRaw === null || deadlineRaw === ''
        ? null
        : Number(deadlineRaw);
      const newlyAdded = parsed.searchParams.get('newlyAdded') === '1'
        || parsed.searchParams.get('newlyAdded') === 'true';
      const educationLevels = [...new Set(parsed.searchParams.get('educationLevels')?.split(',').map(value => value.trim()).filter(value =>
        ['high_school', 'diploma', 'bachelors', 'masters', 'doctorate', 'student'].includes(value)
      ) ?? [])];
      const educationField = parsed.searchParams.get('educationField')?.trim().toLowerCase() ?? '';
      const careerStages = [...new Set(parsed.searchParams.get('careerStages')?.split(',').map(value => value.trim()).filter(value =>
        ['student', 'early-career', 'experienced', 'senior'].includes(value)
      ) ?? [])];

      const filterArgs: Array<string | number> = [];
      let filterClause = '';

      if (sourceFilters.length > 0) {
        filterClause += ` AND j.source IN (${sourceFilters.map(() => '?').join(', ')})`;
        filterArgs.push(...sourceFilters);
      }

      if (deadlineDays !== null && Number.isFinite(deadlineDays)) {
        if (deadlineDays === -1) {
          // "No closing date"
          filterClause += ` AND (${closingDate} IS NULL OR ${closingDate} = '')`;
        } else if (deadlineDays === 0) {
          filterClause += ` AND ${closingDate} IS NOT NULL AND ${closingDate} != ''
            AND LEFT(${closingDate}, 10) = CURRENT_DATE::text`;
        } else if (deadlineDays > 0) {
          // Inclusive: today through N days out (client: days >= 0 && days <= N).
          // Integer is floor-validated — safe to inline into SQLite date modifier.
          const days = Math.min(Math.floor(deadlineDays), 365);
          filterClause += ` AND ${closingDate} IS NOT NULL AND ${closingDate} != ''
            AND LEFT(${closingDate}, 10) >= CURRENT_DATE::text
            AND LEFT(${closingDate}, 10) <= ((CURRENT_DATE + INTERVAL '${days} days')::date)::text`;
        }
      }

      if (newlyAdded) {
        filterClause += ` AND ${freshnessDate} >= (CURRENT_DATE - INTERVAL '7 days')::date`;
      }

      const educationText = `LOWER(COALESCE(jd.education_requirements, ''))`;
      const educationPatterns: Record<string, string> = {
        high_school: '%high school%',
        diploma: '%diploma%',
        bachelors: '%bachelor%',
        masters: '%master%',
        doctorate: '%doctor%',
        student: '%enrolled%',
      };
      if (educationLevels.length > 0) {
        filterClause += ` AND (${educationLevels.map(() => `${educationText} LIKE ?`).join(' OR ')})`;
        filterArgs.push(...educationLevels.map(level => educationPatterns[level]));
      }
      if (educationField) {
        filterClause += ` AND ${educationText} LIKE ?`;
        filterArgs.push(`%${educationField}%`);
      }
      if (careerStages.length > 0) {
        filterClause += ` AND jd.career_stage IN (${careerStages.map(() => '?').join(', ')})`;
        filterArgs.push(...careerStages);
      }

      const activeJobWhere = `
        WHERE j.is_active = 1
          ${visiblePending}
          ${publicDeadline}
          ${filterClause}`;

      // Closing-soon: earliest deadline first. Otherwise freshest first.
      const orderBy = deadlineDays !== null && Number.isFinite(deadlineDays) && deadlineDays >= 0
        ? `LEFT(${closingDate}, 10) ASC, ${freshnessDate} DESC, j.first_seen_at DESC`
        : `${freshnessDate} DESC, j.first_seen_at DESC`;

      const listArgs = [...filterArgs, limit, offset];
      const countArgs = [...filterArgs];
      const titleSuggestions = sourceFilters.length > 0
        ? db.execute({
          sql: `SELECT DISTINCT COALESCE(jd.job_title, raw.title) AS title
            ${jobJoins}
            WHERE j.source IN (${sourceFilters.map(() => '?').join(', ')})
              AND j.is_active = 1
              ${visiblePending}
              AND ${effectiveInventory} = 0
              ${publicDeadline}
              AND TRIM(COALESCE(jd.job_title, raw.title, '')) <> ''
            ORDER BY LOWER(title), title
            LIMIT 50`,
          args: sourceFilters,
        })
        : Promise.resolve({ rows: [] as Array<Record<string, unknown>> });
      const [result, count] = await Promise.all([
        db.execute({
          sql: `SELECT ${jobColumns} ${jobJoins} ${activeJobWhere} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
          args: listArgs,
        }),
        db.execute({
          sql: `SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN ${effectiveInventory} = 0 THEN 1 ELSE 0 END) AS available_total
            ${jobJoins} ${activeJobWhere}`,
          args: countArgs,
        }),
      ]);
      res.setHeader('Cache-Control', PUBLIC_CACHE);
      res.end(JSON.stringify({
        jobs: result.rows,
        total: Number(count.rows[0]?.total ?? 0),
        availableTotal: Number(count.rows[0]?.available_total ?? 0),
        source: sourceGroup?.name ?? (sourceFilters.length === 1 ? sourceFilters[0] : null),
        sources: sourceFilters,
        organization: sourceGroup,
        titleSuggestions: (await titleSuggestions).rows
          .map(row => String(row.title ?? '').trim())
          .filter(Boolean),
      }));
      return;
    }

    if (view === 'saved') {
      const savedSql = `
        SELECT ${jobColumns}
        ${jobJoins}
        WHERE j.is_saved = 1
          ${publicDeadline}
      `;
      const [currentSaved, archiveSaved] = await Promise.all([
        db.execute(savedSql),
        archiveDb.execute(savedSql),
      ]);
      const rows = [...currentSaved.rows, ...archiveSaved.rows].sort((left, right) =>
        Number(right.is_active ?? 0) - Number(left.is_active ?? 0)
        || String(right.scraped_at ?? '').localeCompare(String(left.scraped_at ?? ''))
        || String(right.first_seen_at ?? '').localeCompare(String(left.first_seen_at ?? ''))
      );
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(rows));
      return;
    }

    // Never dump the full corpus — that path was ~7MB / multi-second and made
    // company deep links (/companies/…) unusable. Paginated jobs list instead.
    const [result, count] = await Promise.all([
      db.execute({
        sql: `SELECT ${jobColumns} ${jobJoins}
          WHERE j.is_active = 1
            ${visiblePending}
            ${publicDeadline}
          ORDER BY ${freshnessDate} DESC, j.first_seen_at DESC LIMIT ? OFFSET ?`,
        args: [limit, offset],
      }),
      db.execute(`SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN ${effectiveInventory} = 0 THEN 1 ELSE 0 END) AS available_total
        ${jobJoins}
        WHERE j.is_active = 1
          ${visiblePending}
          ${publicDeadline}`),
    ]);
    res.setHeader('Cache-Control', PUBLIC_CACHE);
    res.end(JSON.stringify({
      jobs: result.rows,
      total: Number(count.rows[0]?.total ?? 0),
      availableTotal: Number(count.rows[0]?.available_total ?? 0),
    }));
  } catch (error) {
    console.error('[API] Failed to load jobs:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Unable to load jobs right now' }));
  }
}
