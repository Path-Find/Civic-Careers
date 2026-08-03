import { initDb } from './db';
import { extractLanguageVehicleRequirements, hasLanguageVehicleCandidate } from './requirements';

const apply = process.argv.includes('--apply');
const sample = process.argv.includes('--sample');
const limitArg = process.argv.find(value => value.startsWith('--limit='));
const perSourceArg = process.argv.find(value => value.startsWith('--per-source='));
const limit = Math.max(1, Number(limitArg?.split('=')[1] || 5000));
const perSource = Math.max(1, Number(perSourceArg?.split('=')[1] || 1));
type Row = { id: string; source: string; title: string; description: string; currentLanguage: string | null; currentVehicle: number | null };
type Result = Row & { language: string[]; vehicle: boolean | null };

async function main() {
  const db = await initDb();
  const query = await db.execute(`
    SELECT j.id, j.source, jd.job_title, jd.description,
           jd.language_requirements, jd.vehicle_required
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    WHERE jd.description IS NOT NULL AND jd.description != ''
    ORDER BY j.source, j.id
  `);
  const rows: Row[] = query.rows.map(row => ({
    id: String(row.id),
    source: String(row.source),
    title: String(row.job_title ?? ''),
    description: String(row.description ?? ''),
    currentLanguage: row.language_requirements as string | null,
    currentVehicle: row.vehicle_required as number | null,
  }));
  const candidates = rows.filter(row => hasLanguageVehicleCandidate(row.description));
  const sourceCounts = new Map<string, number>();
  const selected = sample
    ? candidates.filter(row => {
      const count = sourceCounts.get(row.source) ?? 0;
      if (count >= perSource) return false;
      sourceCounts.set(row.source, count + 1);
      return true;
    })
    : candidates.slice(0, limit);

  console.log(`[Language/vehicle backfill] Scanned ${rows.length} parsed jobs.`);
  console.log(`[Language/vehicle backfill] Candidate descriptions: ${candidates.length}.`);
  console.log(`[Language/vehicle backfill] ${sample ? 'Sample' : apply ? 'Applying' : 'Dry run'} set: ${Math.min(selected.length, limit)} job(s).`);
  const work = selected.slice(0, limit);
  const results: Result[] = work.map(row => {
    const extracted = extractLanguageVehicleRequirements(row.description, row.title);
    return { ...row, language: extracted.language_requirements, vehicle: extracted.vehicle_required };
  });

  for (let i = 0; i < results.length; i += 100) {
    console.log(`[Language/vehicle backfill] Processed ${Math.min(i + 100, results.length)}/${results.length}.`);
  }

  const languageCount = results.filter(result => result.language.length > 0).length;
  const vehicleTrue = results.filter(result => result.vehicle === true).length;
  const vehicleFalse = results.filter(result => result.vehicle === false).length;
  console.log(`[Language/vehicle backfill] Results: ${results.length} successful; ${languageCount} with language requirements; vehicle true ${vehicleTrue}, false ${vehicleFalse}, null ${results.length - vehicleTrue - vehicleFalse}.`);
  for (const result of results.slice(0, sample ? results.length : 25)) {
    const evidence = result.description.split(/\n+/).map(line => line.replace(/^\s*[-*•]\s*/, '').trim()).filter(line => /bilingual|bilingue|english|french|language|fluency|fluent|driver|licen[cs]e|vehicle|transportation/i.test(line)).slice(0, 3);
    console.log(JSON.stringify({ id: result.id, source: result.source, title: result.title, language: result.language, vehicle: result.vehicle, ...(sample ? { evidence } : {}) }));
  }
  if (!apply || sample || results.length === 0) return;

  const updates = results.filter(result => {
    const language = JSON.stringify(result.language);
    const vehicle = result.vehicle === null ? null : (result.vehicle ? 1 : 0);
    return result.currentLanguage !== language || result.currentVehicle !== vehicle;
  });
  if (updates.length > 0) {
    await db.batch(updates.map(result => ({
      sql: `UPDATE job_details SET language_requirements = ?, vehicle_required = ? WHERE id = ?`,
      args: [JSON.stringify(result.language), result.vehicle === null ? null : (result.vehicle ? 1 : 0), result.id],
    })), 'write');
  }
  console.log(`[Language/vehicle backfill] Updated only language_requirements and vehicle_required for ${updates.length} job(s).`);
}

main().catch(error => {
  console.error('[Language/vehicle backfill] Failed:', error);
  process.exitCode = 1;
});
