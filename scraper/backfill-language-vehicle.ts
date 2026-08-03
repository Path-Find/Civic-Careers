import { initDb } from './db';
import { extractExplicitLanguageRequirements, extractLanguageRequirements, extractVehicleRequired, hasLanguageVehicleCandidate } from './requirements';

const apply = process.argv.includes('--apply');
const sample = process.argv.includes('--sample');
const limitArg = process.argv.find(value => value.startsWith('--limit='));
const perSourceArg = process.argv.find(value => value.startsWith('--per-source='));
const limit = Math.max(1, Number(limitArg?.split('=')[1] || 5000));
const perSource = Math.max(1, Number(perSourceArg?.split('=')[1] || 1));
type Row = { id: string; source: string; title: string; description: string; rawText: string; currentLanguage: string | null; currentVehicle: number | null };
type Result = Row & { language: string[]; vehicle: boolean | null };

async function main() {
  const db = await initDb();
  const query = await db.execute(`
    SELECT j.id, j.source, jd.job_title, jd.description,
           COALESCE(raw.raw_text, '') AS raw_text,
           jd.language_requirements, jd.vehicle_required
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    LEFT JOIN raw_jobs raw ON raw.id = j.id
    WHERE jd.description IS NOT NULL AND jd.description != ''
    ORDER BY j.source, j.id
  `);
  const rows: Row[] = query.rows.map(row => ({
    id: String(row.id),
    source: String(row.source),
    title: String(row.job_title ?? ''),
    description: String(row.description ?? ''),
    rawText: String(row.raw_text ?? ''),
    currentLanguage: row.language_requirements as string | null,
    currentVehicle: row.vehicle_required as number | null,
  }));
  const candidates = rows.filter(row => hasLanguageVehicleCandidate(`${row.rawText}\n${row.description}`));
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
    const language = [...new Set([
      ...extractLanguageRequirements(row.description, row.title),
      ...extractExplicitLanguageRequirements(row.rawText),
    ])];
    const vehicle = extractVehicleRequired(row.description) ?? extractVehicleRequired(row.rawText);
    return { ...row, language, vehicle };
  });

  for (let i = 0; i < results.length; i += 100) {
    console.log(`[Language/vehicle backfill] Processed ${Math.min(i + 100, results.length)}/${results.length}.`);
  }

  const languageCount = results.filter(result => result.language.length > 0).length;
  const vehicleTrue = results.filter(result => result.vehicle === true).length;
  const vehicleFalse = results.filter(result => result.vehicle === false).length;
  const languageAdded = results.filter(result => result.language.length > 0 && (!result.currentLanguage || result.currentLanguage === '[]')).length;
  const languageRemoved = results.filter(result => result.language.length === 0 && result.currentLanguage && result.currentLanguage !== '[]').length;
  const vehicleAdded = results.filter(result => result.currentVehicle == null && result.vehicle === true).length;
  const vehicleRemoved = results.filter(result => result.currentVehicle === 1 && result.vehicle !== true).length;
  const updates = results.filter(result =>
    (result.language.length > 0 && (!result.currentLanguage || result.currentLanguage === '[]'))
    || (result.currentVehicle == null && result.vehicle !== null)
  );
  console.log(`[Language/vehicle backfill] Results: ${results.length} successful; ${languageCount} with language requirements; vehicle true ${vehicleTrue}, false ${vehicleFalse}, null ${results.length - vehicleTrue - vehicleFalse}.`);
  console.log(`[Language/vehicle backfill] Changes available: ${updates.length}; language/vehicle field updates ${updates.length}.`);
  console.log(`[Language/vehicle backfill] Language added ${languageAdded}; language removed ${languageRemoved}; vehicle added ${vehicleAdded}; vehicle removed ${vehicleRemoved}.`);
  for (const result of results.slice(0, sample ? results.length : 25)) {
    const evidence = `${result.rawText}\n${result.description}`.split(/\n+/).map(line => line.replace(/^\s*[-*•]\s*/, '').trim()).filter(line => /bilingual|bilingue|english|french|language|fluency|fluent|driver|licen[cs]e|vehicle|transportation/i.test(line)).slice(0, 3);
    console.log(JSON.stringify({ id: result.id, source: result.source, title: result.title, language: result.language, vehicle: result.vehicle, ...(sample ? { evidence } : {}) }));
  }
  if (!apply || sample || results.length === 0) return;

  if (updates.length > 0) {
    await db.batch(updates.map(result => ({
      sql: `UPDATE job_details SET language_requirements = ?, vehicle_required = ? WHERE id = ?`,
      args: [
        result.currentLanguage && result.currentLanguage !== '[]' ? result.currentLanguage : JSON.stringify(result.language),
        result.currentVehicle == null && result.vehicle !== null ? (result.vehicle ? 1 : 0) : result.currentVehicle,
        result.id,
      ],
    })), 'write');
  }
  console.log(`[Language/vehicle backfill] Updated only language_requirements and vehicle_required for ${updates.length} job(s).`);
}

main().catch(error => {
  console.error('[Language/vehicle backfill] Failed:', error);
  process.exitCode = 1;
});
