/** Apply reviewed, source-backed metadata fixes without an AI call. */
import { initDb } from './db';
import dotenv from 'dotenv';
import { sourceMetadataFixFor } from './source-metadata-fixes';

dotenv.config({ quiet: true });

const apply = process.argv.includes('--apply');
const ids = (process.argv.find(argument => argument.startsWith('--ids='))?.slice('--ids='.length) ?? '')
  .split(',').map(id => id.trim()).filter(Boolean);

async function main() {
  if (ids.length === 0) throw new Error('Pass --ids=... to select exact reviewed rows.');
  const db = await initDb();
  for (const id of ids) {
    const fix = sourceMetadataFixFor(id);
    if (!fix) throw new Error(`No reviewed source metadata fix exists for ${id}.`);
    const raw = await db.execute({ sql: 'SELECT raw_text FROM raw_jobs WHERE id = ?', args: [id] });
    const rawText = String(raw.rows[0]?.raw_text ?? '');
    const reviewed = sourceMetadataFixFor(id, rawText);
    if (!reviewed) throw new Error(`Missing source row ${id}.`);
    console.log(JSON.stringify({ id, source: id === '12236' ? 'Ontario Health atHome' : 'unknown', location: reviewed.location, salary: reviewed.salaryRange, benefits: reviewed.benefits, apply }));
    if (!apply) continue;
    await db.execute({
      sql: `UPDATE job_details SET department = ?, location = ?, salary_range = ?, salary_min = ?, salary_max = ?, salary_period = ?, employment_type = ?, duration = ?, hours = ?, description = ?, benefits = ?, education_requirements = ?, experience_requirements = ?, license_requirements = ?, language_requirements = ?, certification_requirements = ?, security_check_required = ?, is_unionized = ?, union_name = ? WHERE id = ?`,
      args: [
        reviewed.department, reviewed.location, reviewed.salaryRange, reviewed.salaryMin, reviewed.salaryMax,
        reviewed.salaryPeriod, reviewed.employmentType, reviewed.duration, reviewed.hours, reviewed.description,
        JSON.stringify(reviewed.benefits), JSON.stringify(reviewed.educationRequirements), JSON.stringify(reviewed.experienceRequirements),
        JSON.stringify(reviewed.licenseRequirements), JSON.stringify(reviewed.languageRequirements), JSON.stringify(reviewed.certificationRequirements),
        reviewed.securityCheckRequired, reviewed.isUnionized, reviewed.unionName, id,
      ],
    });
  }
  console.log(apply ? 'Applied selected source metadata fixes.' : 'Dry run only; no changes made.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
