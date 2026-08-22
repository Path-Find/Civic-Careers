/**
 * Clear exact duplicate values that were written to semantically different
 * structured fields. The source capture is preserved; the field whose value
 * is less authoritative is cleared so the canonical field remains visible.
 *
 *   npx tsx backfill-deduplicate-fields.ts          # dry run
 *   npx tsx backfill-deduplicate-fields.ts --apply  # current + archive
 */
import dotenv from 'dotenv';
import { initDb } from './db';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

type Row = {
  id: string;
  source: string;
  job_title: string | null;
  duration: string | null;
  academic_course: string | null;
  academic_term: string | null;
  hours: string | null;
  academic_workload: string | null;
  academic_schedule: string | null;
  availability: string | null;
  required_skills: string | null;
  software_requirements: string | null;
  responsibility_tags: string | null;
  qualification_tags: string | null;
  education_requirements: string | null;
};

type Change = Row & {
  next: Pick<Row, 'duration' | 'academic_course' | 'academic_workload' | 'academic_schedule' | 'availability' | 'required_skills' | 'software_requirements' | 'responsibility_tags' | 'qualification_tags'>;
  reasons: string[];
};

const QUERY = `
  SELECT j.id, j.source, d.job_title, d.duration, d.academic_course,
    d.academic_term, d.hours, d.academic_workload, d.academic_schedule,
    d.availability, d.required_skills, d.software_requirements,
    d.responsibility_tags, d.qualification_tags, d.education_requirements
  FROM jobs j
  JOIN job_details d ON d.id = j.id
`;

function normalized(value: string | null): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function equal(left: string | null, right: string | null): boolean {
  const a = normalized(left);
  return Boolean(a) && a === normalized(right);
}

function list(value: string | null): string[] {
  try {
    const parsed = JSON.parse(String(value ?? ''));
    return Array.isArray(parsed) ? parsed.map(item => String(item ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean) : [];
  } catch { return []; }
}

function listJson(value: string[]): string | null {
  return value.length ? JSON.stringify(value) : null;
}

function badListItem(value: string): boolean {
  return value.length > 500 || /skip to main content|applylocations|page is loaded|similar jobs|read more|follow us|policy \d+|©/i.test(value);
}

function isForbiddenAvailability(value: string | null): boolean {
  // This is a field-level quality rule, not a source-specific parser rule:
  // labour-relations prose is never a work schedule for any employer.
  return /\bratification\b|\bdocument(?:s)?\b/i.test(String(value ?? ''));
}

function changesFor(rows: Row[]): Change[] {
  return rows.flatMap(row => {
    const next = {
      duration: row.duration,
      academic_course: row.academic_course,
      academic_workload: row.academic_workload,
      academic_schedule: row.academic_schedule,
      availability: row.availability,
      required_skills: row.required_skills,
      software_requirements: row.software_requirements,
      responsibility_tags: row.responsibility_tags,
      qualification_tags: row.qualification_tags,
    };
    const reasons: string[] = [];

    for (const field of ['required_skills', 'software_requirements', 'responsibility_tags', 'qualification_tags'] as const) {
      const before = list(row[field]);
      const after = before.filter(value => !badListItem(value));
      if (after.length !== before.length) {
        next[field] = listJson(after);
        reasons.push(`corrupt ${field}`);
      }
    }

    if (equal(next.required_skills, row.software_requirements)) {
      next.software_requirements = null;
      reasons.push('required_skills = software_requirements');
    }
    if (equal(next.required_skills, row.education_requirements)) {
      next.required_skills = null;
      reasons.push('required_skills = education_requirements');
    }
    if (equal(next.responsibility_tags, row.qualification_tags)) {
      next.qualification_tags = null;
      reasons.push('responsibility_tags = qualification_tags');
    }

    if (isForbiddenAvailability(row.availability)) {
      next.availability = null;
      reasons.push('forbidden availability fragment');
    }

    if (equal(next.duration, row.academic_term)) {
      next.duration = null;
      reasons.push('duration = academic_term');
    }
    if (equal(next.duration, row.academic_schedule)) {
      next.duration = null;
      reasons.push('duration = academic_schedule');
    }
    if (equal(next.academic_schedule, row.academic_term)) {
      next.academic_schedule = null;
      reasons.push('academic_schedule = academic_term');
    }
    if (equal(next.availability, row.academic_term)) {
      next.availability = null;
      reasons.push('availability = academic_term');
    }
    if (equal(next.academic_course, row.academic_term)) {
      next.academic_course = null;
      reasons.push('academic_course = academic_term');
    }
    if (equal(row.hours, next.academic_workload)) {
      next.academic_workload = null;
      reasons.push('hours = academic_workload');
    }

    if (reasons.length === 0) return [];
    return [{ ...row, next, reasons }];
  });
}

function bulkUpdate(changes: Change[]) {
  const args: unknown[] = [];
  const values = changes.map(change => {
    args.push(
      change.id,
      change.next.duration,
      change.next.academic_course,
      change.next.academic_workload,
      change.next.academic_schedule,
      change.next.availability,
      change.next.required_skills,
      change.next.software_requirements,
      change.next.responsibility_tags,
      change.next.qualification_tags,
    );
    return '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  }).join(', ');
  return {
    sql: `UPDATE job_details AS d
      SET duration = v.duration::text,
          academic_course = v.academic_course::text,
          academic_workload = v.academic_workload::text,
          academic_schedule = v.academic_schedule::text,
          availability = v.availability::text,
          required_skills = v.required_skills::text,
          software_requirements = v.software_requirements::text,
          responsibility_tags = v.responsibility_tags::text,
          qualification_tags = v.qualification_tags::text
      FROM (VALUES ${values}) AS v(id, duration, academic_course, academic_workload, academic_schedule, availability, required_skills, software_requirements, responsibility_tags, qualification_tags)
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
    const reasonCounts = changes.flatMap(change => change.reasons).reduce<Record<string, number>>((counts, reason) => {
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {});
    console.log(`[duplicate-fields:${store.label}] ${APPLY ? 'Applying' : 'Dry run'}: ${changes.length} job(s), ${JSON.stringify(reasonCounts)}.`);
    for (const change of changes.slice(0, 60)) {
      console.log(`  ${change.source} ${change.id} ${JSON.stringify(change.job_title)}: ${change.reasons.join(', ')}`);
    }
    if (APPLY && changes.length > 0) await store.write(changes);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
