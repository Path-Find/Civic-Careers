/**
 * Move language-proficiency items out of required_skills into
 * language_requirements (and drop them from skills).
 *
 *   npx tsx backfill-skills-language-split.ts           # dry-run
 *   npx tsx backfill-skills-language-split.ts --apply
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {
  normalizeLanguageRequirements,
  splitLanguageOutOfSkills,
} from './requirements';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

function parseList(raw: string | null): string[] {
  if (!raw || raw === '[]') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function main() {
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const query = await db.execute(`
    SELECT j.id, j.source, j.is_active, d.job_title, d.required_skills, d.language_requirements
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    WHERE d.required_skills IS NOT NULL
      AND d.required_skills != ''
      AND d.required_skills != '[]'
    ORDER BY j.source, j.id
  `);

  type Change = {
    id: string;
    source: string;
    title: string;
    skillsFrom: string;
    skillsTo: string;
    langFrom: string;
    langTo: string;
  };
  const changes: Change[] = [];

  for (const row of query.rows) {
    const skillsFrom = parseList(row.required_skills as string | null);
    const langFrom = parseList(row.language_requirements as string | null);
    const { skills: skillsTo, languages: fromSkills } = splitLanguageOutOfSkills(skillsFrom);
    const langTo = normalizeLanguageRequirements([...langFrom, ...fromSkills]);

    const skillsFromJson = JSON.stringify(skillsFrom);
    const skillsToJson = JSON.stringify(skillsTo);
    const langFromJson = JSON.stringify(langFrom);
    const langToJson = JSON.stringify(langTo);

    if (skillsFromJson === skillsToJson && langFromJson === langToJson) continue;

    changes.push({
      id: String(row.id),
      source: String(row.source),
      title: String(row.job_title ?? ''),
      skillsFrom: skillsFromJson,
      skillsTo: skillsToJson,
      langFrom: langFromJson,
      langTo: langToJson,
    });
  }

  console.log(`[skills-language-split] Scanned ${query.rows.length} jobs with skills.`);
  console.log(`[skills-language-split] Would change: ${changes.length}.`);
  console.log(`[skills-language-split] Skills shortened: ${changes.filter(c => c.skillsFrom !== c.skillsTo).length}.`);
  console.log(`[skills-language-split] Languages filled/merged: ${changes.filter(c => c.langFrom !== c.langTo).length}.`);

  for (const c of changes.slice(0, 25)) {
    console.log(`- ${c.id}`);
    if (c.skillsFrom !== c.skillsTo) console.log(`    skills: ${c.skillsFrom} → ${c.skillsTo}`);
    if (c.langFrom !== c.langTo) console.log(`    lang:   ${c.langFrom} → ${c.langTo}`);
  }
  if (changes.length > 25) console.log(`  …and ${changes.length - 25} more`);

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  for (const c of changes) {
    await db.execute({
      sql: `UPDATE job_details SET required_skills = ?, language_requirements = ? WHERE id = ?`,
      args: [c.skillsTo, c.langTo, c.id],
    });
  }
  console.log(`[skills-language-split] Updated ${changes.length} row(s).`);

  const outPath = path.resolve(__dirname, '../docs/skills-language-split-2026-08-04.md');
  fs.writeFileSync(outPath, [
    '# Skills → language split — 2026-08-04',
    '',
    'Moved language-proficiency items out of `required_skills` into `language_requirements`.',
    '',
    `Updated: ${changes.length} rows.`,
    '',
    '## Job IDs',
    '',
    '```',
    ...changes.map(c => c.id),
    '```',
    '',
  ].join('\n'));
  console.log(`[skills-language-split] Wrote ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
