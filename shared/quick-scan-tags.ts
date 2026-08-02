export const QUICK_SCAN_TAGS = [
  'Education & mentoring',
  'Planning & evaluation',
  'Client care',
  'Operations & compliance',
  'Research & improvement',
  'Collaboration',
  'Equity & advocacy',
  'Student',
] as const;

export type QuickScanTag = typeof QUICK_SCAN_TAGS[number];
