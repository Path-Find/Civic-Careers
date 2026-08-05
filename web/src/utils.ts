import DOMPurify from 'dompurify';

export const jobRoute = (id: string): string => `/job/${encodeURIComponent(id)}`;

export const jobIdFromPath = (path: string): string | null => {
  if (!path.startsWith('/job/')) return null;
  const encodedId = path.slice('/job/'.length).split('/')[0];
  if (!encodedId) return null;
  try {
    return decodeURIComponent(encodedId);
  } catch {
    return null;
  }
};

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

const MANDATORY_REQUIREMENT = /to be considered for employment|must be|required to|are required|registered as a full-time|eligib(?:le|ility)/i;

export const reclassifyMandatoryNiceToHave = (sections: MarkdownSection[]): MarkdownSection[] => {
  const mandatory: string[] = [];
  const result = sections.flatMap(section => {
    if (!/nice to have/i.test(section.heading)) return [section];
    const lines = section.body.split('\n');
    const optional = lines.filter(line => !/^\s*[-•]\s+/.test(line) || !MANDATORY_REQUIREMENT.test(line));
    mandatory.push(...lines.filter(line => /^\s*[-•]\s+/.test(line) && MANDATORY_REQUIREMENT.test(line)));
    return optional.join('\n').trim() ? [{ ...section, body: optional.join('\n').trim() }] : [];
  });

  if (mandatory.length === 0) return result;
  const qualificationsIndex = result.findIndex(section => /qualif/i.test(section.heading));
  if (qualificationsIndex >= 0) {
    result[qualificationsIndex] = {
      ...result[qualificationsIndex],
      body: `${result[qualificationsIndex].body}\n\n${mandatory.join('\n')}`.trim(),
    };
  } else {
    result.push({ heading: 'Qualifications', body: mandatory.join('\n') });
  }
  return result;
};

const QUICK_SCAN_GROUPS: Array<[string, RegExp]> = [
  ['Education & mentoring', /teach|mentor|train|educat|counsel|orient|facilitat/i],
  ['Planning & evaluation', /plan|implement|evaluate|strategy|program|assess/i],
  ['Client care', /client|patient|student|family|community|customer|resident/i],
  ['Operations & compliance', /maintain|monitor|legal|ethical|policy|emergency|documentation|record/i],
  ['Research & improvement', /research|evidence|quality|workgroup|change management/i],
  ['Collaboration', /collaborat|partner|relationship|network|liais|intersector/i],
  ['Equity & advocacy', /advocat|equity|inclus|divers|social justice|access/i],
];

export const getQuickScanLabels = (heading: string, body: string): string[] => {
  const bullets = body.split('\n').filter(line => /^\s*[-•]\s+/.test(line)).join(' ');
  if (!bullets) return [];
  const groups = heading.toLowerCase().includes('qualif')
    ? QUICK_SCAN_GROUPS.filter(([label]) => !['Client care', 'Planning & evaluation'].includes(label))
    : QUICK_SCAN_GROUPS;
  const labels = groups.filter(([, pattern]) => pattern.test(bullets)).map(([label]) => label);
  return /qualif/i.test(heading) && /student|registered as a full-time/i.test(bullets)
    ? ['Student', ...labels]
    : labels;
};

export const compactNiceToHaveLabel = (label: string): string => {
  let compact = label
    .replace(/^(?:familiarity with|knowledge of|experience with|additional training or certifications in|training or certifications in|training or certification in|completion of|ability to|demonstrated knowledge of|demonstrated experience with)\s+/i, '')
    .replace(/\bthe intersection of\s+/i, '')
    .replace(/\band the intersection of\s+/i, ', ')
    .replace(/\s+and\s+(?=[^,]+,)/gi, ', ')
    .replace(/\s+(?:is|would be)\s+(?:an?\s+)?(?:asset|advantage|preferred|plus)\.?$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[.;:]$/, '')
    .trim();

  if (!compact) return label;
  compact = compact.charAt(0).toUpperCase() + compact.slice(1);
  return compact.length > 96 ? `${compact.slice(0, 93).replace(/[,\s]+$/, '')}…` : compact;
};

export const compactOverview = (overview: string): string => {
  const sentences = overview.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean);
  if (sentences.length < 2) return overview;
  const boilerplate = /^(?:[A-Z][\w &'’-]+\s+)?(?:is|are)\s+(?:committed|dedicated|proud|pleased)\s+to\b|^(?:known as|founded in|established in)\b/i;
  return boilerplate.test(sentences[0]) ? sentences.slice(1).join(' ') : overview;
};

/**
 * True when a Compensation/Benefits/Salary section only restates pay (and maybe a
 * generic benefits package) already shown in the sidebar.
 * Keep unique pay (quantified bonuses/premiums) and real itemized benefit detail.
 */
export const isRedundantCompensation = (heading: string, body: string): boolean => {
  if (!/compensation|benefit|salary|pay\b|remuneration/i.test(heading)) return false;
  let text = body.replace(/\s+/g, ' ').trim();
  if (!text) return true;

  // Unique pay beyond base salary — keep. Bare "performance bonus" as a package
  // name is NOT unique (CMHC lists it in structured benefits too); require $/%.
  if (/\b(?:bilingual(?:ism)?\s+bonus|northern\s+allowance|shift\s+premium|market\s+(?:modifier|premium|adjustment)|overtime\s+rate|standby|isolation\s+pay|remote\s+work\s+allowance)\b/i.test(text)) {
    return false;
  }
  // Only keep when the bonus itself is quantified (not merely a $ salary elsewhere in the section).
  if (/\bperformance\s+bonus\b.{0,24}(?:\$[\d,]|\d+\s*%|\d+\s*percent)|(?:\$[\d,]|\d+\s*%|\d+\s*percent).{0,24}\bperformance\s+bonus\b/i.test(text)) {
    return false;
  }

  // Strip generic "includes the benefits/pension package" noise that adds no detail.
  text = text
    .replace(/,?\s*(?:the\s+position\s+includes|includes|plus|with)\s+(?:the\s+)?(?:federal\s+government\s+)?benefits?(?:\s+and\s+pension)?(?:\s+package)?(?:\s*\([^)]{0,100}\))?\.?/gi, ' ')
    .replace(/\b(?:federal\s+government\s+)?benefits?\s+and\s+pension\s+package\.?/gi, ' ')
    .replace(/\b(?:competitive|comprehensive|excellent|standard|generous)\s+(?:employer[- ]paid\s+)?(?:extended\s+health\s+)?benefits?(?:\s+package)?\.?/gi, ' ')
    .replace(/,?\s*plus\s+benefits?\s*\([^)]{0,100}\)\.?/gi, ' ')
    .replace(/,?\s*plus\s+benefits?\.?/gi, ' ')
    .replace(/,?\s*plus\s+applicable\s+premiums?\.?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.,;:\s]+|[.,;:\s]+$/g, '');

  if (!text) return true;

  // Salary range patterns (Annual salary: $X–$Y / From $X to $Y per annum / Salary range: …)
  const money = String.raw`\$?[\d,]+(?:\.\d{1,4})?`;
  const period = String.raw`(?:per\s+)?(?:hour|hr|year|yr|annum|annual(?:ly)?|\/per\s+hour)?`;
  const salaryLine = new RegExp(
    String.raw`^(?:(?:annual\s+|yearly\s+|hourly\s+)?salary(?:\s+range)?|pay(?:\s+rate)?|rate(?:\s+of\s+pay)?|wage|compensation|yearly\s+salary|hourly(?:\s+(?:pay\s+)?rate)?|from|starting\s+at)\s*:?\s*${money}\s*(?:to|[-–—])\s*${money}\s*${period}(?:\s*\([^)]*\))?(?:\s+as\s+per\s+the\s+collective\s+agreement)?(?:\s+plus\s+applicable\s+premiums?)?\.?$`,
    'i',
  );
  const bareRange = new RegExp(
    String.raw`^${money}\s*(?:to|[-–—])\s*${money}\s*${period}(?:\s*\([^)]*\))?\.?$`,
    'i',
  );
  const fromRange = new RegExp(
    String.raw`^from\s+${money}\s+to\s+${money}\s*${period}\.?$`,
    'i',
  );
  const singleRate = new RegExp(
    String.raw`^(?:starting\s+at\s+)?${money}\s*(?:per\s+)?(?:hour|hr|year|yr|annum)?(?:\s*,?\s*plus\s+\d+%\s+vacation\s+pay)?\.?$`,
    'i',
  );
  if (salaryLine.test(text) || bareRange.test(text) || fromRange.test(text) || singleRate.test(text)) return true;

  // Multi-line: every line is salary restatement (or empty after generic strip).
  const lines = body.split('\n').map(line => {
    let t = line.replace(/^\s*[-•*]\s*/, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    t = t
      .replace(/\b(?:the\s+position\s+includes|includes|plus|with)\s+(?:the\s+)?(?:federal\s+government\s+)?benefits?(?:\s+and\s+pension)?(?:\s+package)?\.?/gi, ' ')
      .replace(/\bplus\s+benefits?\s*\([^)]{0,80}\)\.?/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[.,;:\s]+|[.,;:\s]+$/g, '');
    return t;
  }).filter(Boolean);

  const isSalaryRestatement = (line: string) =>
    salaryLine.test(line) || bareRange.test(line) || fromRange.test(line) || singleRate.test(line)
    || /^(?:salary|pay|rate|wage|annual\s+salary|yearly\s+salary|hourly)\b.*\$[\d,]+/i.test(line);

  // Standard package names already stored as structured benefits (CMHC et al.).
  const isPackageBenefitRestatement = (line: string) => {
    const rest = line
      .replace(/\b(?:accrued\s+vacation|annual\s+paid\s+vacation|annual\s+(?:individual\s+)?performance\s+(?:bonus|incentive)|group\s+insurance(?:\s+coverage)?|training(?:\s+and\s+mentorship)?|mentorship|inclusive\s+workplace(?:\s+culture)?(?:\s+and\s+environment)?|defined\s+benefit\s+pension(?:\s+plan)?|comprehensive\s+group\s+insurance(?:\s+plan)?|from\s+day\s+one|to\s+support\s+your\s+well-being|support\s+towards\s+your\s+personal\s+and\s+professional\s+growth(?:\s+with\s+training(?:,\s*mentorship)?(?:\s+and\s+more)?)?|an\s+inclusive\s+workplace\s+culture(?:\s+and\s+environment)?)\b/gi, ' ')
      .replace(/[.,;:&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return rest.length < 4;
  };

  if (lines.length > 0 && lines.every(line => isSalaryRestatement(line) || isPackageBenefitRestatement(line))) {
    return true;
  }

  // Salary + remaining package-only text (comma-joined benefits on one line).
  if (/\$[\d,]+/.test(text) && /(?:salary|pay|rate|wage|compensation|range|annum|annual)/i.test(text)) {
    const withoutSalary = text
      .replace(/(?:(?:annual\s+|yearly\s+|hourly\s+)?salary(?:\s+range)?|pay(?:\s+rate)?|rate(?:\s+of\s+pay)?|wage|compensation|from|starting\s+at)\s*:?\s*\$?[\d,]+(?:\.\d+)?\s*(?:to|[-–—])\s*\$?[\d,]+(?:\.\d+)?\s*(?:per\s+)?(?:year|yr|annum|hour|hr)?\.?/gi, ' ')
      .replace(/\$[\d,]+(?:\.\d+)?\s*(?:to|[-–—])\s*\$[\d,]+(?:\.\d+)?\s*(?:per\s+)?(?:year|yr|annum|hour|hr)?\.?/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!withoutSalary || isPackageBenefitRestatement(withoutSalary)) return true;
  }

  // Short section: has a dollar salary range and no *itemized* benefit detail.
  // Name-drops of package benefits (group insurance, vacation) alone don't count.
  const hasItemizedBenefits = /\b(?:\d+%\s*employer|employer-paid|sick\s+leave|wellness\s+allowance|\$\d+\s+for|paramedical|health care spending|telus virtual|weeks?\s+vacation|om\s*ers)\b/i.test(body)
    || (/(?:^|\n)\s*[-•*]\s+/.test(body)
      && /\b(?:health|dental|pension|paramedical|wellness)\b/i.test(body)
      && body.split('\n').filter(l => /^\s*[-•*]/.test(l)).length >= 2
      && !lines.every(line => isSalaryRestatement(line) || isPackageBenefitRestatement(line)));

  if (!hasItemizedBenefits
    && /\$[\d,]+/.test(text)
    && /(?:salary|pay|rate|wage|compensation|range|annum|annual)/i.test(text)
    && text.length < 400) {
    return true;
  }

  return false;
};

const PLACEHOLDER_LINE = /^(?:\(?(?:none|n\/a|not applicable|not specified|not provided)\)?[.!]?)$/i;

export const isPlaceholderSection = (body: string): boolean => {
  const lines = body.split('\n').map(line => line.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean);
  return lines.length > 0 && lines.every(line => PLACEHOLDER_LINE.test(line));
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
  if (min !== null && max !== null && min === max) return `${fmt(min)}${periodLabel}`;
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
