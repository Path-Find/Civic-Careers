import DOMPurify from 'dompurify';

export interface MarkdownSection {
  heading: string;
  body: string;
}

export const parseMarkdownSections = (md: string | null): MarkdownSection[] => {
  if (!md) return [];
  return md.split(/(?=^#{1,3}\s+)/m).map(chunk => {
    const match = chunk.match(/^#{1,3}\s+(.+?)(?:\n|$)/);
    return match
      ? { heading: match[1].trim(), body: chunk.slice(match[0].length).trim() }
      : { heading: '', body: chunk.trim() };
  }).filter(section => section.heading || section.body);
};

const QUICK_SCAN_GROUPS: Array<[string, RegExp]> = [
  ['Client care', /client|patient|student|family|community|customer|resident/i],
  ['Planning & evaluation', /plan|implement|evaluate|strategy|program|assess/i],
  ['Collaboration', /collaborat|partner|relationship|network|liais|intersector/i],
  ['Education & mentoring', /teach|mentor|train|educat|counsel|orient|facilitat/i],
  ['Equity & advocacy', /advocat|equity|inclus|divers|social justice|access/i],
  ['Research & improvement', /research|evidence|quality|workgroup|change management/i],
  ['Operations & compliance', /maintain|monitor|legal|ethical|policy|emergency|documentation|record/i],
];

export const getQuickScanLabels = (heading: string, body: string): string[] => {
  const bullets = body.split('\n').filter(line => /^\s*[-•]\s+/.test(line)).join(' ');
  if (!bullets) return [];
  const groups = heading.toLowerCase().includes('qualif')
    ? QUICK_SCAN_GROUPS.filter(([label]) => !['Client care', 'Planning & evaluation'].includes(label))
    : QUICK_SCAN_GROUPS;
  return groups.filter(([, pattern]) => pattern.test(bullets)).map(([label]) => label);
};

export const renderMarkdown = (md: string | null): string => {
  if (!md) return '';
  const normalized = md
    // Blank lines between bullets should not turn each item into a separate paragraph.
    .replace(/(^\s*[-•]\s+.+)\n+(?=\s*[-•]\s+)/gm, '$1\n');
  const html = normalized
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^#{1,2}\s+(.+)$/gm, '<h3 style="font-size:1rem;font-weight:800;margin:1.5em 0 0.4em;color:#0f172a">$1</h3>')
    .replace(/^#{3,}\s+(.+)$/gm, '<h4 style="font-size:0.875rem;font-weight:700;margin:1em 0 0.3em;color:#1e293b">$1</h4>')
    .replace(/^[-•]\s+(.+)$/gm, '<li style="margin:0.2em 0">$1</li>')
    .replace(/<\/li>\s+(?=<li)/g, '</li>')
    .replace(/((?:<li[^>]*>.*<\/li>\s*)+)/g, '<ul style="padding-left:1.25em;margin:0.25em 0">$1</ul>')
    .replace(/\n{2,}/g, '</p><p style="margin:0.75em 0">')
    .replace(/\n/g, '<br>')
    .replace(/^(?!<[hup])/, '<p style="margin:0">')
    .replace(/(?<![>])$/, '</p>');
  return DOMPurify.sanitize(html, { ADD_ATTR: ['style'] });
};

export const formatSalary = (job: { salary_min: number | null; salary_max: number | null; salary_period: string | null }): string | null => {
  const { salary_min: min, salary_max: max, salary_period: period } = job;
  if (!min && !max) return null;
  const fmt = (n: number) => period === 'hourly' ? `$${n}/hr` : period === 'flat' ? `$${Math.round(n).toLocaleString()}` : `$${Math.round(n / 1000)}K`;
  const periodLabel = period === 'hourly' ? '' : period === 'monthly' ? ' / mo' : period === 'flat' ? ' flat' : ' / yr';
  if (min && max) return `${fmt(min)} – ${fmt(max)}${periodLabel}`;
  return `${fmt((min ?? max)!)}${periodLabel}`;
};

export const daysUntilClose = (dateStr: string | null): number | null => {
  if (!dateStr) return null;
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }
  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const fixCasing = (s: string | null): string => {
  if (!s) return '';
  const cleaned = s.replace(/\s+/g, ' ').trim();
  if (cleaned === cleaned.toUpperCase()) {
    return cleaned.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
  return cleaned;
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0].trim();
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[month - 1];
    if (monthName) {
      return `${monthName} ${day}, ${year}`;
    }
  }
  return dateStr;
};
