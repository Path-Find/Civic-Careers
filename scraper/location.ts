/**
 * Canonical location strings for job_details.location.
 *
 * Single:  "Guelph, ON"
 * Multi:   "Guelph, ON; Toronto, ON; Hamilton, ON"
 *
 * Prefer empty over inventing a city or wrong province.
 */

const PROVINCE_CODES = new Set([
  'ON', 'QC', 'NS', 'NB', 'MB', 'SK', 'AB', 'BC', 'PE', 'NL', 'NT', 'NU', 'YT',
]);

/** Full name / common aliases → two-letter code */
const PROVINCE_ALIASES: Record<string, string> = {
  ontario: 'ON',
  'on.': 'ON',
  quebec: 'QC',
  québec: 'QC',
  'qc.': 'QC',
  'nova scotia': 'NS',
  'ns.': 'NS',
  'new brunswick': 'NB',
  'nb.': 'NB',
  manitoba: 'MB',
  'mb.': 'MB',
  saskatchewan: 'SK',
  'sk.': 'SK',
  alberta: 'AB',
  'ab.': 'AB',
  'british columbia': 'BC',
  'bc.': 'BC',
  'prince edward island': 'PE',
  pei: 'PE',
  'pe.': 'PE',
  'newfoundland and labrador': 'NL',
  newfoundland: 'NL',
  labrador: 'NL',
  'nl.': 'NL',
  'northwest territories': 'NT',
  'n.w.t.': 'NT',
  'nwt': 'NT',
  nunavut: 'NU',
  yukon: 'YT',
  'yukon territory': 'YT',
};

/**
 * Bare city / place → default CA province (public-sector corpus).
 * Keys must be lowercase.
 */
const CITY_PROVINCE: Record<string, string> = {
  // Ontario
  ajax: 'ON',
  alliston: 'ON',
  ancaster: 'ON',
  aurora: 'ON',
  barrie: 'ON',
  beeton: 'ON',
  belleville: 'ON',
  bolton: 'ON',
  borden: 'ON',
  bowmanville: 'ON',
  brampton: 'ON',
  brantford: 'ON',
  brockville: 'ON',
  burlington: 'ON',
  caledon: 'ON',
  cambridge: 'ON',
  chatham: 'ON',
  'city of kawartha lakes': 'ON',
  cobourg: 'ON',
  collingwood: 'ON',
  cornwall: 'ON',
  'east gwillimbury': 'ON',
  etobicoke: 'ON',
  georgina: 'ON',
  'greater toronto area': 'ON',
  gta: 'ON',
  guelph: 'ON',
  'halton hills': 'ON',
  hamilton: 'ON',
  innisfil: 'ON',
  'kawartha lakes': 'ON',
  king: 'ON',
  'king city': 'ON',
  kingston: 'ON',
  kitchener: 'ON',
  'lambton county': 'ON',
  leamington: 'ON',
  lindsay: 'ON',
  london: 'ON',
  markham: 'ON',
  midland: 'ON',
  milton: 'ON',
  mississauga: 'ON',
  moosonee: 'ON',
  newmarket: 'ON',
  'niagara falls': 'ON',
  'north bay': 'ON',
  'north york': 'ON',
  oakville: 'ON',
  orangeville: 'ON',
  orillia: 'ON',
  oshawa: 'ON',
  ottawa: 'ON',
  'owen sound': 'ON',
  pembroke: 'ON',
  penetanguishene: 'ON',
  petawawa: 'ON',
  peterborough: 'ON',
  pickering: 'ON',
  'quinte west': 'ON',
  renfrew: 'ON',
  'richmond hill': 'ON',
  ridgetown: 'ON',
  sarnia: 'ON',
  scarborough: 'ON',
  sharon: 'ON',
  simcoe: 'ON',
  'st catharines': 'ON',
  'st. catharines': 'ON',
  'st thomas': 'ON',
  'st. thomas': 'ON',
  'stoney creek': 'ON',
  stouffville: 'ON',
  stratford: 'ON',
  sudbury: 'ON',
  'greater sudbury': 'ON',
  thorold: 'ON',
  'thunder bay': 'ON',
  timmins: 'ON',
  toronto: 'ON',
  trenton: 'ON',
  vaughan: 'ON',
  walkerton: 'ON',
  waterloo: 'ON',
  'waterloo region': 'ON',
  welland: 'ON',
  whitby: 'ON',
  wiarton: 'ON',
  windsor: 'ON',
  woodstock: 'ON',
  nepean: 'ON',
  maple: 'ON',
  middlefield: 'ON',
  wolfedale: 'ON',
  kincardine: 'ON',
  niagara: 'ON',
  'port hope': 'ON',
  'sault ste marie': 'ON',
  'sault ste. marie': 'ON',

  // Quebec
  bagotville: 'QC',
  gatineau: 'QC',
  kuujjuaq: 'QC',
  mirabel: 'QC',
  montreal: 'QC',
  montréal: 'QC',
  'port-cartier': 'QC',
  sherbrooke: 'QC',

  // British Columbia
  agassiz: 'BC',
  burnaby: 'BC',
  'burns lake': 'BC',
  'campbell river': 'BC',
  castlegar: 'BC',
  chilliwack: 'BC',
  colwood: 'BC',
  coquitlam: 'BC',
  cranbrook: 'BC',
  delta: 'BC',
  esquimalt: 'BC',
  gabriola: 'BC',
  'grand forks': 'BC',
  'greater vancouver': 'BC',
  hope: 'BC',
  kamloops: 'BC',
  kelowna: 'BC',
  langley: 'BC',
  'maple ridge': 'BC',
  merritt: 'BC',
  nanaimo: 'BC',
  'new westminster': 'BC',
  'north vancouver': 'BC',
  penticton: 'BC',
  'port hardy': 'BC',
  'port mcneill': 'BC',
  'powell river': 'BC',
  'prince george': 'BC',
  'prince rupert': 'BC',
  richmond: 'BC',
  saanichton: 'BC',
  'salmon arm': 'BC',
  'salt spring island': 'BC',
  smithers: 'BC',
  surrey: 'BC',
  terrace: 'BC',
  vancouver: 'BC',
  vernon: 'BC',
  victoria: 'BC',
  'white rock': 'BC',
  'williams lake': 'BC',

  // Alberta
  anzac: 'AB',
  banff: 'AB',
  calgary: 'AB',
  'cold lake': 'AB',
  edmonton: 'AB',
  'fort mcmurray': 'AB',
  jasper: 'AB',
  lethbridge: 'AB',
  'mackenzie county': 'AB',
  'red deer': 'AB',
  wainwright: 'AB',

  // Manitoba
  brandon: 'MB',
  'crystal city': 'MB',
  morden: 'MB',
  shilo: 'MB',
  winnipeg: 'MB',

  // Saskatchewan
  'cypress hills': 'SK',
  'cypress hills provincial park': 'SK',
  regina: 'SK',
  saskatoon: 'SK',
  'swift current': 'SK',

  // Nova Scotia
  dartmouth: 'NS',
  halifax: 'NS',
  sydney: 'NS',
  truro: 'NS',

  // New Brunswick
  fredericton: 'NB',
  oromocto: 'NB',
  'saint john': 'NB',

  // Territories
  iqaluit: 'NU',
  whitehorse: 'YT',
  yellowknife: 'NT',
};

/** Campus / site aliases → "City, XX" */
const PLACE_ALIASES: Record<string, string> = {
  'keele campus': 'Toronto, ON',
  'keele campus, ontario': 'Toronto, ON',
  'keele campus, ontario, canada': 'Toronto, ON',
  'newnham campus': 'Toronto, ON',
  'king campus': 'King City, ON',
  'st. george (downtown toronto)': 'Toronto, ON',
  'st george (downtown toronto)': 'Toronto, ON',
  'glendon (bayview & lawrence)': 'Toronto, ON',
  'glendon': 'Toronto, ON',
  'university of toronto mississauga': 'Mississauga, ON',
  'st. catharines, main campus': 'St. Catharines, ON',
  'greater toronto area': 'Toronto, ON',
  gta: 'Toronto, ON',
  'main campus': '', // too vague alone
  'central campus': '',
  'hsc- central campus': '',
  'hsc - central campus': '',
  'city hall': '',
  'marine campus': 'North Vancouver, BC',
  'sherbrooke 680': 'Sherbrooke, QC',
  'cypress hills - hidden valley': 'Cypress Hills, SK',
  'cypress hills provincial park': 'Cypress Hills, SK',
};

const JUNK_EXACT = new Set([
  'n/a',
  'na',
  'none',
  'null',
  'canada',
  'ontario',
  'quebec',
  'québec',
  'bc',
  'ab',
  'mb',
  'sk',
  'ns',
  'nb',
  'pe',
  'nl',
  'yt',
  'nt',
  'nu',
  'various',
  'various locations',
  'various location',
  'multiple',
  'multiple locations',
  'multiple location',
  'multiple locations across canada',
  'other',
  'tbd',
  'to be determined',
  'remote',
  'virtual',
  'work from home',
  'wfh',
  'nationwide',
  'national',
]);

const JUNK_PREFIX = [
  /^within a national research council/i,
  /^multiple locations?,?\s*(bc|ab|on|qc|mb|sk)?$/i,
  /^various locations?,?\s*(bc|ab|on|qc|mb|sk)?$/i,
];

function resolveProvinceToken(token: string): string | null {
  const t = token.trim().replace(/\.$/, '');
  if (!t) return null;
  const upper = t.toUpperCase();
  if (PROVINCE_CODES.has(upper)) return upper;
  // NFD strip diacritics so "québec" / "Québec" match "quebec"
  const lower = t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (PROVINCE_ALIASES[lower]) return PROVINCE_ALIASES[lower];
  if (PROVINCE_ALIASES[t.toLowerCase()]) return PROVINCE_ALIASES[t.toLowerCase()];
  return null;
}

function titleCaseCity(city: string): string {
  const cleaned = city.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  // Preserve known multi-word forms with periods
  const lower = cleaned.toLowerCase();
  const known: Record<string, string> = {
    'st. catharines': 'St. Catharines',
    'st catharines': 'St. Catharines',
    'st. thomas': 'St. Thomas',
    'st thomas': 'St. Thomas',
    'st. john': 'St. John',
    'saint john': 'Saint John',
    'north bay': 'North Bay',
    'thunder bay': 'Thunder Bay',
    'niagara falls': 'Niagara Falls',
    'richmond hill': 'Richmond Hill',
    'fort mcmurray': 'Fort McMurray',
    'new westminster': 'New Westminster',
    'greater vancouver': 'Greater Vancouver',
    'waterloo region': 'Waterloo Region',
    'halton hills': 'Halton Hills',
    'king city': 'King City',
    'prince george': 'Prince George',
    'prince rupert': 'Prince Rupert',
    'salmon arm': 'Salmon Arm',
    'williams lake': 'Williams Lake',
    'red deer': 'Red Deer',
    'cold lake': 'Cold Lake',
    'swift current': 'Swift Current',
    'crystal city': 'Crystal City',
    'city of kawartha lakes': 'City of Kawartha Lakes',
    'kawartha lakes': 'Kawartha Lakes',
    'lambton county': 'Lambton County',
    'north york': 'North York',
    'owen sound': 'Owen Sound',
    'port-cartier': 'Port-Cartier',
    montréal: 'Montreal',
    montreal: 'Montreal',
    'cypress hills': 'Cypress Hills',
  };
  if (known[lower]) return known[lower];

  return cleaned
    .split(/(\s+|-)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || part === '-') return part;
      if (/^(and|of|the|for|to|in|or|at|by|as|a|an)$/i.test(part)) return part.toLowerCase();
      // McX / MacX
      if (/^mc[a-z]/i.test(part)) {
        return 'Mc' + part.slice(2, 3).toUpperCase() + part.slice(3).toLowerCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

function lookupCityProvince(city: string): string | null {
  const key = city.toLowerCase().replace(/\s+/g, ' ').trim();
  if (CITY_PROVINCE[key]) return CITY_PROVINCE[key];
  // without periods: "st. catharines" already handled; try without "city of "
  const stripped = key.replace(/^city of\s+/, '');
  if (CITY_PROVINCE[stripped]) return CITY_PROVINCE[stripped];
  return null;
}

function formatCityProv(city: string, prov: string): string {
  const c = titleCaseCity(city);
  if (!c || !PROVINCE_CODES.has(prov)) return '';
  return `${c}, ${prov}`;
}

/**
 * Split on commas, reattaching bare province tokens to the previous segment.
 * "Toronto, ON" → ["Toronto, ON"]
 * "Calgary (ab), Halifax (ns), Vancouver, BC" → ["Calgary (ab)", "Halifax (ns)", "Vancouver, BC"]
 * "Delta, Langley, Surrey" → ["Delta", "Langley", "Surrey"]
 */
function smartCommaSplit(s: string): string[] {
  const raw = s.split(',').map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (const part of raw) {
    const asProv = resolveProvinceToken(part);
    // Attach pure province tokens (not city names that happen to match nothing)
    if (out.length && asProv && !lookupCityProvince(part) && !/\(/.test(part)) {
      out[out.length - 1] = `${out[out.length - 1]}, ${part}`;
    } else {
      out.push(part);
    }
  }
  return out;
}

/** Parse one location segment into "City, XX" or "" (no multi-city lists). */
function normalizeOnePlace(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return '';

  // Drop trailing country
  s = s.replace(/,?\s*canada\.?$/i, '').trim();

  const lower = s.toLowerCase();
  if (JUNK_EXACT.has(lower)) return '';
  if (JUNK_PREFIX.some((re) => re.test(s))) return '';

  // Place aliases (campuses, etc.)
  if (Object.prototype.hasOwnProperty.call(PLACE_ALIASES, lower)) {
    return PLACE_ALIASES[lower];
  }

  // "City (ON)" / "City (Alberta)" / "City (québec)" — prefer paren province over a trailing code
  // (also repairs bad backfill "Calgary (ab), BC")
  const paren = s.match(/^(.+?)\s*\(([^)]+)\)\s*(?:,\s*[A-Za-z.]{2,})?$/u);
  if (paren) {
    const city = paren[1].trim();
    const prov = resolveProvinceToken(paren[2]);
    if (prov && city && !JUNK_EXACT.has(city.toLowerCase())) {
      return formatCityProv(city, prov);
    }
  }

  // Single "City, Province" [, Country already stripped]
  if (s.includes(',')) {
    const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      let prov: string | null = null;
      let provIdx = -1;
      for (let i = parts.length - 1; i >= 1; i--) {
        const p = resolveProvinceToken(parts[i]);
        if (p) {
          prov = p;
          provIdx = i;
          break;
        }
      }
      if (prov && provIdx > 0) {
        let city = parts.slice(0, provIdx).join(', ').trim();
        city = city
          .replace(/,?\s*main campus$/i, '')
          .replace(/\s+main campus$/i, '')
          .trim();
        if (city && !JUNK_EXACT.has(city.toLowerCase()) && !/^(multiple|various)/i.test(city)) {
          // If the "city" still embeds a paren province, use that
          const embedded = city.match(/^(.+?)\s*\(([^)]+)\)$/u);
          if (embedded) {
            const p2 = resolveProvinceToken(embedded[2]);
            if (p2) return formatCityProv(embedded[1].trim(), p2);
          }
          return formatCityProv(city, prov);
        }
        if (prov && (!city || /^(multiple|various)/i.test(city))) return '';
      }
    }
  }

  // Bare city → map
  const bare = s
    .replace(/,?\s*main campus$/i, '')
    .trim();
  if (JUNK_EXACT.has(bare.toLowerCase())) return '';
  const mapped = lookupCityProvince(bare);
  if (mapped) return formatCityProv(bare, mapped);

  // Unmapped bare place — leave empty rather than invent province
  return '';
}

function splitMulti(raw: string): string[] {
  let s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return [];

  if (/;/.test(s)) {
    return s.split(';').map((p) => p.trim()).filter(Boolean);
  }
  if (/\s\/\s/.test(s) || (s.includes('/') && s.split('/').length > 2)) {
    return s.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
  }
  if (/\s+or\s+/i.test(s)) {
    return s.split(/\s+or\s+/i).map((p) => p.trim()).filter(Boolean);
  }
  if (/^[^,;]+\/[^,;]+$/.test(s)) {
    return s.split('/').map((p) => p.trim()).filter(Boolean);
  }
  // Comma-separated multi-city (and City, XX) — smart split rejoins province codes
  if (s.includes(',')) {
    return smartCommaSplit(s);
  }
  return [s];
}

function dedupeJoin(items: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.join('; ');
}

/**
 * Normalize a free-text location to canonical form.
 * Returns "" when empty or unusable.
 */
export function normalizeLocation(raw: string | null | undefined): string {
  if (raw == null) return '';
  let s = String(raw).replace(/\s+/g, ' ').trim();
  if (!s) return '';

  const lower = s.toLowerCase();
  if (JUNK_EXACT.has(lower)) return '';
  if (JUNK_PREFIX.some((re) => re.test(s))) return '';

  // Full-string place alias
  if (Object.prototype.hasOwnProperty.call(PLACE_ALIASES, lower)) {
    return PLACE_ALIASES[lower];
  }

  // Some boards emit province-first values such as "SK, Moose Jaw".
  // Canonical storage is always city-first: "Moose Jaw, SK".
  const provinceFirst = s.match(/^(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\s*,\s*(.+)$/i);
  if (provinceFirst) {
    s = `${provinceFirst[2]}, ${provinceFirst[1]}`;
  }

  const parts = splitMulti(s);
  const normalized = parts.map((p) => normalizeOnePlace(p)).filter(Boolean);
  return dedupeJoin(normalized);
}

/** Source-specific location recovery for layouts whose address list is glued together. */
export function normalizeSourceLocation(source: string | null | undefined, rawText: string | null | undefined): string {
  if (source === 'Municipality of Chatham-Kent' && /Location:\s*Various municipal arenas/i.test(String(rawText ?? ''))) {
    return 'Chatham-Kent, ON';
  }
  if (source === 'Shared Health Manitoba') {
    // Shared Health labels the facility as "Site" but separately provides the
    // actual city. Store the city in the canonical location field; the site
    // remains available in the source text/department context.
    const text = String(rawText ?? '').replace(/\s+/g, ' ');
    const city = text.match(/\bCity\s*:\s*(.+?)(?=\s+(?:Site|Employer|Department(?:\s*\/\s*Unit)?|Job\s+Stream|Union|Anticipated\s+Start\s+Date|FTE|Hiring\s+Status|Employment\s+arrangement|Work\s+Location|Position)\s*:?|$)/i)?.[1]?.replace(/[\u200B\u00A0]/g, ' ').trim() ?? '';
    return normalizeLocation(city) || normalizeLocation(`${city}, MB`);
  }
  return '';
}

/** Recover a Manitoba city when an old Shared Health capture has no body text. */
export function normalizeSourceLocationFromTitle(source: string | null | undefined, title: string | null | undefined): string {
  if (source !== 'Shared Health Manitoba') return '';
  const city = String(title ?? '').match(/\b(Winnipeg|Selkirk|Gimli|Brandon|Thompson|The Pas|Swan Lake|Steinbach|Winkler|Portage(?:\s+La)?\s+Prairie)\b/i)?.[1] ?? '';
  return city ? normalizeLocation(`${city}, MB`) : '';
}

/** Recover a labelled source location when the AI parser leaves it empty. */
export function extractLabeledLocation(rawText: string | null | undefined): string {
  if (!rawText) return '';
  const text = rawText.replace(/\s+/g, ' ');
  const end = String.raw`(?=\b(?:department|employment(?:\s+type)?|job\s+(?:type|category|requisition)|close(?:\s+date)?|posting\s+(?:start|end\s+)?date|salary|compensation|work\s+model|full\/part\s+time|primary\s+(?:category|city)|other\s+locations?|province|language\s+requirement|business\s+function|date\s+posted|number\s+of\s+persons|category\s+type|position\s+type|college\/administrative|job\s+schedule|apply\s+before|location\s*[-:])\b|$)`;
  const patterns = [
    new RegExp(String.raw`\b(?:job\s+)?location\s*:\s*(.+?)${end}`, 'i'),
    new RegExp(String.raw`\bprimary\s+city\s*:\s*(.+?)${end}`, 'i'),
    new RegExp(String.raw`\bjob\s+location\s+(.+?)${end}`, 'i'),
    new RegExp(String.raw`\blocations\s+(.+?)${end}`, 'i'),
    new RegExp(String.raw`\blocation(?=[A-Z])(.+?)${end}`, 'i'),
  ];
  for (const pattern of patterns) {
    const rawValue = (text.match(pattern)?.[1] ?? '')
      .replace(/\s+\((?:on-site|hybrid|remote)\).*$/i, '')
      .trim();
    const addressPairs = [...rawValue.matchAll(/\b([A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*)*),\s*(ON|QC|NS|NB|MB|SK|AB|BC|PE|NL|NT|NU|YT)\b/gi)]
      .map(match => `${match[1]}, ${match[2]}`);
    const value = addressPairs.length > 1 || (addressPairs.length === 1 && /\b(?:city|address)\s*:/i.test(rawValue))
      ? normalizeLocation(addressPairs.join('; '))
      : normalizeLocation(rawValue);
    if (value) return value;
  }
  return '';
}

/** Exposed for tests / backfill diagnostics */
export function locationCityProvinceMapSize(): number {
  return Object.keys(CITY_PROVINCE).length;
}
