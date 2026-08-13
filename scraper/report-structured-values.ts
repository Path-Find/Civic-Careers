import { initDb } from './db';
import dotenv from 'dotenv';
import { QUICK_SCAN_TAGS } from '../shared/quick-scan-tags';

dotenv.config({ quiet: true });

const CONTROLLED_VALUES = {
  salary_period: ['yearly', 'hourly', 'monthly', 'flat'],
  work_model: ['On-site', 'Hybrid', 'Remote'],
  employment_type: ['Full-time', 'Part-time', 'Contract', 'Permanent', 'Occasional', 'Seasonal'],
  listing_type: ['regular', 'ongoing_recruitment', 'inventory'],
  academic_role_type: [
    'faculty',
    'teaching_assistant',
    'research_assistant',
    'research_associate',
    'postdoctoral',
    'academic_instructor',
    'course_staff',
  ],
} as const;

const BOOLEAN_FIELDS = [
  'is_inventory',
  'is_student',
  'vehicle_required',
  'security_check_required',
  'is_unionized',
] as const;

const TAG_FIELDS = {
  responsibility_tags: new Set(QUICK_SCAN_TAGS.filter(tag => tag !== 'Student')),
  qualification_tags: new Set(QUICK_SCAN_TAGS),
} as const;

const SUSPICIOUS_AVAILABILITY = /^(?:a\s+)?(?:minimum|maximum)\s+of$/i;

export type StructuredAuditRow = {
  id: string;
  source: string;
  job_title: string;
  [field: string]: unknown;
};

export type StructuredValueIssue = {
  field: string;
  value: string;
  count: number;
  examples: Array<{ id: string; source: string; title: string }>;
};

function isBlank(value: unknown): boolean {
  return value == null || String(value).trim() === '';
}

function printable(value: unknown): string {
  if (value == null || String(value).trim() === '') return '(empty)';
  return String(value).trim();
}

function addIssue(
  issues: Map<string, StructuredValueIssue>,
  row: StructuredAuditRow,
  field: string,
  value: unknown,
): void {
  const printableValue = printable(value);
  const key = `${field}\u0000${printableValue}`;
  const current = issues.get(key);
  if (current) {
    current.count += 1;
    if (current.examples.length < 5) {
      current.examples.push({ id: row.id, source: row.source, title: row.job_title });
    }
    return;
  }
  issues.set(key, {
    field,
    value: printableValue,
    count: 1,
    examples: [{ id: row.id, source: row.source, title: row.job_title }],
  });
}

function parseStoredArray(value: unknown): { values?: unknown[]; malformed: boolean } {
  if (isBlank(value)) return { values: [], malformed: false };
  try {
    const parsed = JSON.parse(String(value));
    return { values: Array.isArray(parsed) ? parsed : undefined, malformed: !Array.isArray(parsed) };
  } catch {
    return { malformed: true };
  }
}

export function findStructuredValueIssues(rows: StructuredAuditRow[]): StructuredValueIssue[] {
  const issues = new Map<string, StructuredValueIssue>();

  for (const row of rows) {
    for (const [field, allowed] of Object.entries(CONTROLLED_VALUES)) {
      const value = row[field];
      if (!isBlank(value) && !(allowed as readonly unknown[]).includes(value)) {
        addIssue(issues, row, field, value);
      }
    }

    for (const field of BOOLEAN_FIELDS) {
      const value = row[field];
      if (!isBlank(value) && ![0, 1, '0', '1'].includes(value as never)) {
        addIssue(issues, row, field, value);
      }
    }

    for (const [field, allowed] of Object.entries(TAG_FIELDS)) {
      const stored = parseStoredArray(row[field]);
      if (stored.malformed || !stored.values) {
        addIssue(issues, row, field, '(invalid JSON array)');
        continue;
      }
      for (const value of stored.values) {
        if (typeof value !== 'string' || !allowed.has(value as never)) {
          addIssue(issues, row, field, value);
        }
      }
    }

    const availability = row.availability;
    if (!isBlank(availability) && SUSPICIOUS_AVAILABILITY.test(String(availability).trim())) {
      addIssue(issues, row, 'availability', availability);
    }
  }

  return [...issues.values()].sort((a, b) => a.field.localeCompare(b.field) || b.count - a.count || a.value.localeCompare(b.value));
}

function printReport(rows: StructuredAuditRow[], issues: StructuredValueIssue[], includeInactive: boolean): void {
  console.log(`Structured-value report (${includeInactive ? 'all' : 'active'} parsed jobs)`);
  console.log(`Rows checked: ${rows.length}`);
  console.log(`Issues found: ${issues.reduce((total, issue) => total + issue.count, 0)}`);

  if (!issues.length) {
    console.log('No unexpected controlled values or known availability fragments found.');
    return;
  }

  for (const issue of issues) {
    console.log(`\n${issue.field}: ${issue.value} (${issue.count})`);
    for (const example of issue.examples) {
      console.log(`  - ${example.source} | ${example.title} | ${example.id}`);
    }
  }
}

async function main(): Promise<void> {
  const includeInactive = process.argv.includes('--include-inactive');
  const json = process.argv.includes('--json');
  const failOnInvalid = process.argv.includes('--fail-on-invalid');
  const db = await initDb();
  const result = await db.execute(`
    SELECT j.id, j.source, jd.job_title,
           jd.salary_period, jd.work_model, jd.employment_type, jd.listing_type,
           jd.academic_role_type, jd.is_inventory, jd.is_student,
           jd.vehicle_required, jd.security_check_required, jd.is_unionized,
           jd.responsibility_tags, jd.qualification_tags, jd.availability
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    WHERE ${includeInactive ? '1 = 1' : 'j.is_active = 1'}
    ORDER BY j.source, jd.job_title, j.id
  `);
  const rows = result.rows.map(row => ({
    ...row,
    id: String(row.id),
    source: String(row.source ?? ''),
    job_title: String(row.job_title ?? ''),
  })) as StructuredAuditRow[];
  const issues = findStructuredValueIssues(rows);

  if (json) {
    console.log(JSON.stringify({ includeInactive, rowsChecked: rows.length, issues }, null, 2));
  } else {
    printReport(rows, issues, includeInactive);
  }

  if (failOnInvalid && issues.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
