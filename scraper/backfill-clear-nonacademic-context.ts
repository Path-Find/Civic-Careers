/**
 * Remove academic context captured on ordinary jobs without re-running the
 * parser. Real course-only rows keep a validated course value; the academic
 * role filter itself requires an explicit academic role.
 *
 *   npx tsx backfill-clear-nonacademic-context.ts
 *   npx tsx backfill-clear-nonacademic-context.ts --apply
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { isAcademicJob, isLikelyAcademicCourse } from './academic-context';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

type Row = {
  id: string;
  source: string;
  job_title: string | null;
  academic_role_type: string | null;
  academic_course: string | null;
  academic_term: string | null;
  academic_workload: string | null;
  academic_office_hours: string | null;
  academic_supervisor: string | null;
  academic_appointment_type: string | null;
  academic_schedule: string | null;
};

type Change = Row & {
  next: Pick<Row, 'academic_role_type' | 'academic_course' | 'academic_term' | 'academic_workload' | 'academic_office_hours' | 'academic_supervisor' | 'academic_appointment_type' | 'academic_schedule'>;
  reason: string;
};

const QUERY = `
  SELECT j.id, j.source, d.job_title, d.academic_role_type,
    d.academic_course, d.academic_term, d.academic_workload,
    d.academic_office_hours, d.academic_supervisor,
    d.academic_appointment_type, d.academic_schedule
  FROM jobs j
  JOIN job_details d ON d.id = j.id
  WHERE d.academic_role_type IS NOT NULL
     OR d.academic_course IS NOT NULL
     OR d.academic_term IS NOT NULL
     OR d.academic_workload IS NOT NULL
     OR d.academic_office_hours IS NOT NULL
     OR d.academic_supervisor IS NOT NULL
     OR d.academic_appointment_type IS NOT NULL
     OR d.academic_schedule IS NOT NULL
`;

function value(value: string | null): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function changesFor(rows: Row[]): Change[] {
  return rows.flatMap(row => {
    const academicAllowed = isAcademicJob(row.source, row.job_title, row.academic_role_type);
    const courseAllowed = !academicAllowed && isLikelyAcademicCourse(row.source, row.job_title, row.academic_course);
    if (academicAllowed) return [];

    const next = {
      academic_role_type: null,
      academic_course: courseAllowed ? value(row.academic_course) || null : null,
      academic_term: null,
      academic_workload: null,
      academic_office_hours: null,
      academic_supervisor: null,
      academic_appointment_type: null,
      academic_schedule: null,
    };
    const changed = Object.keys(next).some(key => value(row[key as keyof Row] as string | null) !== value(next[key as keyof typeof next]));
    if (!changed) return [];
    return [{ ...row, next, reason: courseAllowed ? 'non-academic title; retained validated course' : 'non-academic title' }];
  });
}

function bulkUpdate(changes: Change[]) {
  const args: unknown[] = [];
  const values = changes.map(change => {
    args.push(
      change.id,
      change.next.academic_role_type,
      change.next.academic_course,
      change.next.academic_term,
      change.next.academic_workload,
      change.next.academic_office_hours,
      change.next.academic_supervisor,
      change.next.academic_appointment_type,
      change.next.academic_schedule,
    );
    return '(?, ?, ?, ?, ?, ?, ?, ?, ?)';
  }).join(', ');
  return {
    sql: `UPDATE job_details AS d
      SET academic_role_type = v.academic_role_type::text,
          academic_course = v.academic_course::text,
          academic_term = v.academic_term::text,
          academic_workload = v.academic_workload::text,
          academic_office_hours = v.academic_office_hours::text,
          academic_supervisor = v.academic_supervisor::text,
          academic_appointment_type = v.academic_appointment_type::text,
          academic_schedule = v.academic_schedule::text
      FROM (VALUES ${values}) AS v(id, academic_role_type, academic_course, academic_term, academic_workload, academic_office_hours, academic_supervisor, academic_appointment_type, academic_schedule)
      WHERE d.id = v.id::text`,
    args,
  };
}

async function main() {
  const db = await initDb() as any;
  const archive = db as {
    executeArchive?: (statement: string) => Promise<{ rows: Row[] }>;
    batchArchive?: (statements: Array<{ sql: string; args: unknown[] }>) => Promise<unknown>;
  };
  const stores: Array<{
    label: string;
    read: (statement: string) => Promise<{ rows: Row[] }>;
    write: (changes: Change[]) => Promise<void>;
  }> = [{
    label: 'current',
    read: statement => db.execute(statement),
    write: async changes => {
      for (let i = 0; i < changes.length; i += 500) await db.batch([bulkUpdate(changes.slice(i, i + 500))]);
    },
  }];
  if (archive.executeArchive && archive.batchArchive) {
    stores.push({
      label: 'archive',
      read: statement => archive.executeArchive!(statement),
      write: async changes => {
        for (let i = 0; i < changes.length; i += 500) await archive.batchArchive!([bulkUpdate(changes.slice(i, i + 500))]);
      },
    });
  }

  for (const store of stores) {
    const result = await store.read(QUERY);
    const changes = changesFor(result.rows);
    const retainedCourse = changes.filter(change => change.reason.includes('retained')).length;
    console.log(`[academic-context:${store.label}] ${APPLY ? 'Applying' : 'Dry run'}: ${changes.length} non-academic row(s), ${retainedCourse} validated course value(s) retained.`);
    for (const change of changes.slice(0, 80)) {
      console.log(`  ${change.source} ${change.id} ${JSON.stringify(change.job_title)}: ${change.reason}`);
    }
    if (APPLY && changes.length > 0) await store.write(changes);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

