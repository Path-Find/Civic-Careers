import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { scrapeRawAndStage } from '../utils';
import type { JobSummary } from '../utils';

export interface AlongsideJob extends JobSummary {
  id: string;
  title: string;
  url: string;
  applicationUrl: string;
  location?: string;
  category?: string;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'");
}

function cleanText(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function decodeWidgetHtml(script: string): string {
  const match = script.match(/htmlNode\.innerHTML\s*=\s*"([\s\S]*?)";\s*$/m);
  if (!match?.[1]) return '';

  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return match[1].replace(/\\\//g, '/').replace(/\\"/g, '"');
  }
}

export function extractAlongsideJobs(script: string): AlongsideJob[] {
  const html = decodeWidgetHtml(script);
  if (!html) return [];

  const jobs: AlongsideJob[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = match[1];
    if (!row) continue;

    const detailMatch = row.match(/href="(https:\/\/jobs\.careerbeacon\.com\/details\/[^"?]+\/(\d+)[^"]*)"/i);
    if (!detailMatch?.[2]) continue;

    const id = `careerbeacon_${detailMatch[2]}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const titleMatch = row.match(/class="block showVisited"[^>]*>([\s\S]*?)<\/a>/i);
    const locationMatch = row.match(/data-headline="Location"[^>]*>([\s\S]*?)<\/td>/i);
    const categoryMatch = row.match(/data-headline="Category"[^>]*>([\s\S]*?)<\/td>/i);

    jobs.push({
      id,
      title: cleanText(titleMatch?.[1] ?? `CareerBeacon job ${detailMatch[2]}`),
      url: `https://www.careerbeacon.com/en/job/${detailMatch[2]}`,
      applicationUrl: `https://www.careerbeacon.com/en/apply/${detailMatch[2]}`,
      location: cleanText(locationMatch?.[1] ?? '') || undefined,
      category: cleanText(categoryMatch?.[1] ?? '') || undefined,
    });
  }

  return jobs;
}

export async function scrapeAlongside(
  db: Client,
  context: BrowserContext,
  widgetUrls: string | string[],
  sourceName: string,
) {
  const urls = Array.isArray(widgetUrls) ? widgetUrls : [widgetUrls];
  const jobs = new Map<string, AlongsideJob>();

  for (const widgetUrl of urls) {
    const response = await fetch(widgetUrl);
    if (!response.ok) throw new Error(`${sourceName}: Alongside widget returned HTTP ${response.status}`);
    const discovered = extractAlongsideJobs(await response.text());
    for (const job of discovered) jobs.set(job.id, job);
  }

  console.log(`\nScraping ${sourceName} (Alongside/CareerBeacon) — ${jobs.size} jobs`);
  for (const job of jobs.values()) {
    await scrapeRawAndStage(db, context, job, sourceName);
  }
  console.log(`\n[${sourceName}] Done — ${jobs.size} jobs discovered.`);
}
