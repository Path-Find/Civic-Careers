export type PendingMetadata = {
  salaryText: string | null;
  isStudent: number | null;
};

const NUMBER = String.raw`\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?`;
const AMOUNT = String.raw`\$\s*${NUMBER}`;
const RANGE = new RegExp(String.raw`${AMOUNT}(?:\s*[-–—]\s*\$?\s*${NUMBER})?(?:\s*(?:/|per)\s*(?:hour|hr|year|yr|month|mo|week|day)|\s*(?:hourly|annual|yearly|bi[- ]weekly|biweekly))?`, 'gi');

/** Recover only obvious source text for the pending listing sidebar. */
export function extractPendingMetadata(title: string | null | undefined, rawText: string): PendingMetadata {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  let salaryText: string | null = null;
  for (const match of normalized.matchAll(RANGE)) {
    const value = match[0].replace(/\s+/g, ' ').trim();
    const start = match.index ?? 0;
    const context = normalized.slice(Math.max(0, start - 100), start + value.length + 100);
    if (/salary|wage|pay|rate|compensation|hourly|annual|per hour|per year/i.test(context)) {
      salaryText = value;
      break;
    }
  }

  const titleAndText = `${title ?? ''}\n${rawText}`;
  const isStudent = /\b(?:student|co[- ]?op|intern(?:ship)?)\b/i.test(title ?? '')
    || /\b(?:student|co[- ]?op|intern(?:ship)?)\s+(?:position|role|job|employment|placement|program|opportunity)\b/i.test(titleAndText)
    || /\b(?:position|role|job)\s+for\s+(?:a\s+)?student\b/i.test(titleAndText)
    ? 1
    : null;

  return { salaryText, isStudent };
}
