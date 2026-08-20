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
