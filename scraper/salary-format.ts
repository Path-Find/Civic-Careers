import { normalizeSalaryPeriod, type SalaryPeriod } from './validate';

const MONEY = String.raw`\$\s*\d+(?:,\d{3})*(?:\.\d{1,4})?`;
// The source may glue the next sentence directly onto the period
// (`HourlyThe Corporation`), so the period cannot require a trailing word
// boundary. The amount itself is still anchored by the dollar token.
const PERIOD = /(?:hourly|per\s+hour|\/\s*hour|hr|hrs|bi[- ]?weekly|every\s+two\s+weeks?|weekly|per\s+week|monthly|per\s+month|mo|yearly|annual|annually|per\s+year|per\s+annum|flat|per\s+course|per\s+assignment|per\s+project|stipend|honorarium)/i;

export type ParsedSalary = {
  min: number;
  max: number;
  period: SalaryPeriod;
  display: string;
};

/** Extract only the first salary amount/range and an explicit pay period. */
export function parseSalaryText(raw: string | null | undefined, periodHint?: string | null): ParsedSalary | null {
  const text = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const amounts = [...text.matchAll(new RegExp(MONEY, 'g'))]
    .map(match => Number(match[0].replace(/[$,\s]/g, '')))
    .filter(Number.isFinite);
  if (amounts.length === 0) return null;

  const explicitPeriod = String(periodHint ?? '').trim() || text.match(PERIOD)?.[0] || '';
  if (!explicitPeriod) return null;
  const period = normalizeSalaryPeriod(explicitPeriod);
  const min = amounts[0];
  const max = amounts.length > 1 ? amounts[1] : min;
  return { min, max, period, display: formatSalaryDisplay(min, max, period) };
}

export function isCanonicalSalary(value: string | null | undefined): boolean {
  return /^\$\d[\d,]*(?:\.\d{1,4})?(?:\s+-\s+\$\d[\d,]*(?:\.\d{1,4})?)?\s+(?:hourly|monthly|biweekly|weekly|yearly|flat)$/i.test(String(value ?? '').trim());
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

export function formatSalaryDisplay(min: number | null, max: number | null, period: string | null): string {
  if (min === null && max === null) return '';
  const range = min !== null && max !== null && min !== max
    ? `${formatSalaryAmount(min)} - ${formatSalaryAmount(max)}`
    : formatSalaryAmount((min ?? max) as number);
  return period ? `${range} ${period}` : range;
}
