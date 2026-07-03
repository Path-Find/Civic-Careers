import { Client } from '@libsql/client/http';
import { BrowserContext } from 'playwright';
import { scrapeRawAndStage } from '../utils';

export async function scrapeRSS(
  db: Client,
  context: BrowserContext,
  feedUrl: string,
  sourceName: string,
  idPrefix: string
) {
  const res = await fetch(feedUrl);
  const xml = await res.text();

  const items = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/g)];
  console.log(`\nScraping ${sourceName} (RSS) — ${items.length} jobs`);

  for (const [, body] of items) {
    if (!body) continue;
    const linkMatch = body.match(/<link>(.*?)<\/link>/);
    if (!linkMatch?.[1]) continue;
    const url = linkMatch[1].trim();
    const idMatch = url.match(/JOBID=([^&]+)/i) || url.match(/jobid=([^&]+)/i);
    if (!idMatch?.[1]) continue;
    const id = `${idPrefix}_${idMatch[1].toLowerCase()}`;
    await scrapeRawAndStage(db, context, { id, url }, sourceName);
  }
}
