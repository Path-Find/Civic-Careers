import { normalizeSalaryPeriod, type SalaryPeriod } from './validate';

const MONEY = String.raw`\$\s*\d+(?:,\d{3})*(?:\.\d{1,4})?\s*[kKmM]?`;
// The source may glue the next sentence directly onto the period
// (`HourlyThe Corporation`), so the period cannot require a trailing word
// boundary. The amount itself is still anchored by the dollar token.
const PERIOD = /(?:hourly|per\s+hour|\/\s*hour|hr|hrs|daily|per\s+day|\/\s*day|day|bi[- ]?weekly|every\s+two\s+weeks?|weekly|per\s+week|monthly|per\s+month|mo|yearly|annual|annually|per\s+year|per\s+annum|\/\s*yr|yr|flat|per\s+course|per\s+assignment|per\s+project|stipend|honorarium)/i;

export type ParsedSalary = {
  min: number;
  max: number;
  period: SalaryPeriod;
  display: string;
};

/** Extract only the first salary amount/range and a nearby explicit pay period. */
export function parseSalaryText(raw: string | null | undefined, periodHint?: string | null): ParsedSalary | null {
  const text = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const amountMatches = [...text.matchAll(new RegExp(MONEY, 'g'))];
  if (amountMatches.length === 0) return null;
  const first = amountMatches[0];
  const second = amountMatches[1];
  const rangeSeparator = second && /^[^\d$]{0,20}(?:to|[-–—])\s*$/i.test(text.slice(first.index! + first[0].length, second.index));
  const selected = rangeSeparator ? [first, second] : [first];
  const amounts = selected
    .map(match => {
      const token = match[0].replace(/[$,\s]/g, '');
      const suffix = token.slice(-1).toLowerCase();
      const multiplier = suffix === 'k' ? 1_000 : suffix === 'm' ? 1_000_000 : 1;
      const number = suffix === 'k' || suffix === 'm' ? token.slice(0, -1) : token;
      return Number(number) * multiplier;
    })
    .filter(Number.isFinite);
  const periodAfter = (match: RegExpMatchArray): string => {
    const start = match.index! + match[0].length;
    // Only inspect the text immediately attached to this amount. This avoids
    // turning an incidental amount such as "$400 annual wellness allowance"
    // into the period for an earlier salary range.
    const nearby = text.slice(start, Math.min(text.length, start + 24)).split(/[$.!?]/, 1)[0];
    return nearby.match(PERIOD)?.[0] || '';
  };
  const periodBefore = text.slice(Math.max(0, first.index! - 24), first.index!).match(PERIOD)?.[0] || '';
  const explicitPeriod = String(periodHint ?? '').trim()
    || periodAfter(first)
    || (second && rangeSeparator ? periodAfter(second) : '')
    || periodBefore;
  if (!explicitPeriod) return null;
  const period = normalizeSalaryPeriod(explicitPeriod);
  const min = amounts[0];
  const max = amounts.length > 1 ? amounts[1] : min;
  return { min, max, period, display: formatSalaryDisplay(min, max, period) };
}

export function isCanonicalSalary(value: string | null | undefined): boolean {
  return /^\$\d[\d,]*(?:\.\d{1,4})?(?:-\$\d[\d,]*(?:\.\d{1,4})?)?\s+(?:hour|day|month|biweekly|week|year|flat)$/i.test(String(value ?? '').trim());
}

/**
 * Build a clean display string from already-parsed salary_min/salary_max/
 * salary_period, instead of using the raw source-captured text — which often
 * carries its own field label along for the ride ("Hourly Range:$19.00 -
 * $24.50"). Legitimate data, just not a clean display string.
 */
export function formatSalaryAmount(n: number): string {
  return n % 1 === 0 ? `$${n.toLocaleString()}` : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DISPLAY_PERIOD: Record<SalaryPeriod, string> = {
  hourly: 'hour',
  daily: 'day',
  monthly: 'month',
  biweekly: 'biweekly',
  weekly: 'week',
  yearly: 'year',
  flat: 'flat',
};

export function formatSalaryDisplay(min: number | null, max: number | null, period: string | null): string {
  if (min === null && max === null) return '';
  const range = min !== null && max !== null && min !== max
    ? `${formatSalaryAmount(min)}-${formatSalaryAmount(max)}`
    : formatSalaryAmount((min ?? max) as number);
  return period ? `${range} ${DISPLAY_PERIOD[period as SalaryPeriod] ?? period}` : range;
}
