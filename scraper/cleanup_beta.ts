import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import { cleanOverviewBoilerplate } from './cleanup_description';

dotenv.config({ path: 'scraper/.env' });

async function main() {
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const limit = Number(process.argv[2] || 10);
  const changedOnly = process.argv.includes('--changed');
  const result = await db.execute({
    sql: `SELECT id, job_title, description
          FROM job_details
          WHERE description LIKE '%## Overview%'
          ORDER BY id
          LIMIT ?`,
    args: [changedOnly ? 10000 : limit],
  });

  let printed = 0;
  let changed = 0;
  let charsRemoved = 0;
  for (const row of result.rows) {
    const title = String(row.job_title || '');
    const description = String(row.description || '');
    const match = description.match(/## Overview\s*\n([\s\S]*?)(?=\n## |$)/i);
    if (!match) continue;

    const before = match[1].trim();
    const after = cleanOverviewBoilerplate(before, title);
    if (before !== after) {
      changed++;
      charsRemoved += before.length - after.length;
    }
    if (changedOnly && before === after) continue;
    if (printed >= limit) break;
    printed++;
    console.log(`\n[${row.id}] ${title}`);
    console.log(`BEFORE: ${before.replace(/\s+/g, ' ').slice(0, 320)}`);
    console.log(`AFTER:  ${after.replace(/\s+/g, ' ').slice(0, 320)}`);
    console.log(`CHANGED: ${before !== after}`);
  }

  console.log(`\nSUMMARY: ${result.rows.length} scanned, ${changed} changed, ${charsRemoved} characters removed`);

  await db.close();
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
