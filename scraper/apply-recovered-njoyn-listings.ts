/** Apply listing-board evidence recovered from a non-headless browser session.
 * The records remain soft-parsed: no description or structured detail is invented.
 */
import { initDb, cleanupExpiredJobsForSource, savePendingJob } from './db';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

type Listing = [id: string, title: string, closingDate: string | null];

const BOARDS: Record<string, { baseUrl: string; listings: Listing[] }> = {
  'City of Abbotsford': {
    baseUrl: 'https://abbotsford.njoyn.com/CL3/xweb/Xweb.asp?CLID=55227&Page=JobDetails&Jobid=',
    listings: [
      ['J0826-0427', 'Project Coordinator', '2026-09-30'],
      ['J0726-0392', 'Utility Person (Roads)', '2026-08-30'],
      ['J0826-0366', 'HR Advisor, Disability Management', '2026-08-28'],
      ['J0826-0057', 'Aux Rec Worker III (Program Leader)', '2026-08-26'],
      ['J0826-0303', 'Operations Maintenance Coordinator', '2026-08-26'],
      ['J0826-0055', 'Aux Facility Attendant', '2026-08-26'],
      ['J0726-1093', 'Sr Energy & Climate Action Spec. (TERM)', '2026-08-21'],
      ['J0626-0835', 'Aux Fitness Worker III (Instructor)', '2026-08-23'],
      ['J0626-0834', 'Aux Fitness Worker II (Instructor)', '2026-08-23'],
      ['J0626-0836', 'Aux Fitness Worker I (Instructor)', '2026-08-21'],
      ['J0626-0827', 'Aux Weight Room Attendant', '2026-08-21'],
      ['J0726-0128', 'City Manager', null],
    ],
  },
  'Lambton College': {
    baseUrl: 'https://lambtoncollege.njoyn.com/CL4/xweb/Xweb.asp?CLID=72351&Page=JobDetails&Jobid=',
    listings: [['J0826-0391', 'Associate Faculty - Electrical Trades Apprenticeship', '2026-08-28']],
  },
  'University of Northern British Columbia': {
    baseUrl: 'https://unbc.njoyn.com/CL/xweb/Xweb.asp?clid=125926&Page=JobDetails&Jobid=',
    listings: [
      ['J0826-0107', 'FAPT45-26 HHSC 405-640 A1 Sessional Instructor - Pathopysiology', null],
      ['J0726-0533', 'FANU07-26 - Senior Laboratory Instructor, School of Nursing (Open Campus)', null],
      ['J0726-0532', 'FANU06-26 - Assistant Professor, Northern Baccalaureate Nursing', null],
      ['J0726-0531', 'FANU05-26 - Senior Laboratory Instructor, School of Nursing', null],
      ['J0726-0529', 'FANU04-26 - Senior Laboratory Instructor, Northern Collaborative', null],
      ['J0726-0528', 'FANU03-26 - Assistant Professor (0.7 FTE), MScN Nurse Practitioner (Prince George)', null],
      ['J0726-0526', 'FANU02-26 - Senior Laboratory Instructor, School of Nursing (Fort St John)', null],
      ['J0726-0524', 'FANU01-26 - Senior Instructor, School of Nursing (Fort St John or Prince George)', null],
      ['J0726-0504', 'FABUSM 01-26 Assistant Professor', null],
      ['J0726-0456', 'FAPT43-26 NRSG 415 Medical and Surgical Nursing Practice 2', null],
      ['J0726-0389', 'FAPT41-26 CPSC 100 & CPSC 321', null],
      ['J0726-0383', 'FAPT 39-26 Part-Time Instructor First Nations Studies 390-3: Seminar in First Nations Studies', null],
      ['J0726-0379', 'FAPT35-26 Part-Time Instructor PSYC 215 – Research Design and Methodology in Psychology', null],
      ['J0726-0285', 'FAPT33-26 Part-Time Instructor PLAN 208/FNST 249 Land and Indigenous Reconciliation Studio', null],
      ['J0626-0230', 'FAPT31-26 Part-Time Instructor NURS 461: Rural Health and Nursing', null],
      ['J0626-0225', 'FAPT27-26 Part-Time Instructor NURS 326: Nursing and Theory Practice: Mental Health', null],
      ['J0626-0221', 'FAPT23-26 Part-Time Instructor NURS 458 Remote Nursing Certified Practice', null],
      ['J0626-0220', 'FAPT22-26 Part-Time Instructor NRSG 415 Medical and Surgical Nursing Practice 2', null],
      ['J0626-0219', 'FAPT21-26 Part-Time Instructor NRSG 410 Professional Practice: Mental Health and Addictions Nursing', null],
      ['J0626-0218', 'FAPT 20-26 Part-Time Instructor NRSG 301 Health Assessment', null],
      ['J0626-0150', 'FAPT17-26 Part-Time Instructor NURS 422: Indigenous Health and Nursing', null],
      ['J0626-0149', 'FAPT16-26 Part-Time Instructor NURS 329: Year 3 Objective Structured Clinical Examination', null],
      ['J0626-0148', 'FAPT15-26 Part-Time Instructor NURS 329: Year 3 Objective Structured Clinical Examination', null],
      ['J0626-0147', 'FAPT14-26 Part-Time Instructor NURS 328: Nursing Laboratory', null],
      ['J0626-0144', 'FAPT11-26 Part-Time Instructor NURS 326: Nursing and Theory Practice: Mental Health', null],
      ['J0626-0145', 'FAPT12-26 Part-Time Instructor NURS 328: Nursing Laboratory', null],
      ['J0626-0143', 'FAPT10-26 Part-Time Instructor NURS 323: Nursing and Theory Practice: Older Adult', null],
      ['J0626-0142', 'FAPT09-26 Part-Time Instructor NURS 318: Nursing and Theory Practice: Pediatrics', null],
      ['J0626-0141', 'FAPT08-26 Part-Time Instructor NURS 317: Nursing and Theory Practice: Maternity', null],
      ['J0626-0140', 'FAPT07-26 Part-Time Instructor NURS 317: Nursing and Theory Practice: Maternity', null],
      ['J0626-0138', 'FAPT06-26 Part-Time Instructor NURS 306 Practicum: Introduction to Epidemiology', null],
      ['J0126-0401', 'FACRC01-26 - Canada Research Chair Tier 2: Indigenous Planning', null],
      ['J0126-0402', 'FACRC02-26 - Endowed Research Chair in Watershed and/or Aquatic Sciences', null],
      ['J0126-0155', 'FAORI01-26 Full Professor/Associate Professor - Canada Impact+ Research Chairs program', null],
      ['J0825-0285', 'FAPT46-25 Part-Time Instructor - Early Modern Literature in English', null],
    ],
  },
  'University of the Fraser Valley': {
    baseUrl: 'https://ufv.njoyn.com/CL3/xweb/Xweb.asp?CLID=56144&Page=JobDetails&Jobid=',
    listings: [
      ['J0426-0833', 'Department Assistant, Industry Services & Part-Time Trades', '2026-08-24'],
      ['J0826-0163', 'Director, Financial Services', '2026-09-04'],
      ['J0726-1099', 'Program Technician, Agriculture', '2026-08-21'],
      ['J0626-0931', 'Academic Advisor', '2026-08-21'],
      ['J0726-0709', 'Sessional Instructor, School of Health Studies', null],
      ['J0426-0473', 'Assistant Professor, Automotive', '2026-08-27'],
      ['J0726-0281', 'Chief Information Security Officer', '2026-08-25'],
    ],
  },
};

async function main() {
  const db = await initDb();
  const runStartedAt = new Date(Date.now() - 120_000).toISOString();
  let total = 0;
  for (const [source, board] of Object.entries(BOARDS)) {
    for (const [id, title, closingDate] of board.listings) {
      await savePendingJob(db, {
        id,
        url: `${board.baseUrl}${encodeURIComponent(id)}&lang=1`,
        application_url: `${board.baseUrl}${encodeURIComponent(id)}&lang=1`,
        source,
        title,
        closing_date: closingDate,
      });
      total += 1;
    }
    await cleanupExpiredJobsForSource(db, source, runStartedAt);
    console.log(`[Recovered Njoyn:${source}] Applied ${board.listings.length} soft-parsed listing(s).`);
  }
  console.log(`[Recovered Njoyn] Applied ${total} listing(s); no descriptions were invented.`);
}

main().catch(error => {
  console.error('[Recovered Njoyn] Failed:', error);
  process.exitCode = 1;
});
