/**
 * Restore preserved captures only after their individual source URLs have
 * been opened and confirmed live.
 *
 *   npx tsx restore-verified-live-captures.ts       # report only
 *   npx tsx restore-verified-live-captures.ts --apply
 */
import dotenv from 'dotenv';
import { initDb, retireJob } from './db';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

type VerifiedRow = {
  id: string;
  title: string;
  closingDate: string | null;
  closingStatus: 'known' | 'open_until_filled';
  verifiedUrl: string;
};

// These are source URLs opened with Playwright on 2026-08-21. The source
// pages were live; dates are copied only where the page displayed one.
const VERIFIED_ROWS: VerifiedRow[] = [
  {
    id: 'brant_eDT6vvfUhD',
    title: 'Junior Planner, Development – 1 Vacancy',
    closingDate: null,
    closingStatus: 'open_until_filled',
    verifiedUrl: 'https://countyofbrant.applytojob.com/apply/eDT6vvfUhD/Junior-Planner-Development-1-Vacancy',
  },
  {
    id: 'Laboratory-Attendant-2_JR102340-1',
    title: 'Laboratory Attendant 2',
    closingDate: null,
    closingStatus: 'open_until_filled',
    verifiedUrl: 'https://publichealthontario.wd10.myworkdayjobs.com/en-US/PHOCareerSite/job/PHO-Ottawa-Laboratory-2380-St-Laurent-Boulevard-Ottawa-ON/Laboratory-Attendant-2_JR102340-1',
  },
  {
    id: 'Quality-Improvement-Student_JR102357',
    title: 'Quality Improvement Student',
    closingDate: '2026-08-22',
    closingStatus: 'known',
    verifiedUrl: 'https://publichealthontario.wd10.myworkdayjobs.com/en-US/PHOCareerSite/job/Toronto-661-University/Quality-Improvement-Student_JR102357',
  },
  {
    id: 'Quality-Improvement-Student_JR102358',
    title: 'Quality Improvement Student',
    closingDate: '2026-08-22',
    closingStatus: 'known',
    verifiedUrl: 'https://publichealthontario.wd10.myworkdayjobs.com/en-US/PHOCareerSite/job/Toronto-661-University/Quality-Improvement-Student_JR102358',
  },
];

const VERIFIED_DEAD_ROWS = [
  {
    id: '64aad7d84f1a',
    source: 'University of Windsor',
    verifiedUrl: 'https://efhc.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/3821/?mode=location',
  },
];

async function main() {
  const db = await initDb();
  const result = await db.execute({
    sql: `SELECT id, source, is_active, publication_status
          FROM jobs
          WHERE id IN (${VERIFIED_ROWS.map(() => '?').join(', ')})`,
    args: VERIFIED_ROWS.map(row => row.id),
  });

  const existing = new Map(result.rows.map(row => [String(row.id), row]));
  for (const row of VERIFIED_ROWS) {
    const current = existing.get(row.id);
    if (!current) throw new Error(`Expected current job row was not found: ${row.id}`);
    console.log(JSON.stringify({
      id: row.id,
      source: current.source,
      title: row.title,
      closing_date: row.closingDate,
      closing_status: row.closingStatus,
      verified_url: row.verifiedUrl,
      action: APPLY ? 'restore' : 'would restore',
    }));
  }
  for (const row of VERIFIED_DEAD_ROWS) {
    console.log(JSON.stringify({ ...row, action: APPLY ? 'archive' : 'would archive' }));
  }

  if (!APPLY) return;

  for (const row of VERIFIED_ROWS) {
    await db.batch([
      {
        sql: `UPDATE raw_jobs
              SET title = ?, pending_closing_date = ?, pending_closing_date_status = ?
              WHERE id = ?`,
        args: [row.title, row.closingDate, row.closingStatus, row.id],
      },
      {
        sql: `UPDATE job_details SET job_title = COALESCE(NULLIF(TRIM(job_title), ''), ?) WHERE id = ?`,
        args: [row.title, row.id],
      },
      {
        sql: `UPDATE jobs SET is_active = 1, publication_status = 'soft_parsed' WHERE id = ?`,
        args: [row.id],
      },
    ], 'write');
  }
  for (const row of VERIFIED_DEAD_ROWS) await retireJob(db, row.id);
  console.log(`[Verified live captures] Restored ${VERIFIED_ROWS.length} source-confirmed row(s).`);
}

main().catch(error => {
  console.error('[Verified live captures] Failed:', error);
  process.exitCode = 1;
});
