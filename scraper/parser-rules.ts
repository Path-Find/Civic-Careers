import { normalizeJobTitle, normalizeSourceJobTitle, normalizeSourceJobTitleFromRaw } from './title';

export type ParserRuleScope = 'global' | 'engine' | 'source';

export interface ParserContext {
  source: string;
  engine?: string | null;
}

export interface ParserRuleDefinition {
  id: string;
  scope: ParserRuleScope;
  source?: string;
  engine?: string;
  description: string;
}

export interface ParsedTitleResult {
  title: string;
  ruleIds: string[];
}

/**
 * Keep this map deliberately small. It documents engines for sources that
 * currently have source-scoped title rules; it is not a second scraper task
 * registry. Unknown sources remain source-scoped and are never promoted to an
 * engine or global rule by default.
 */
const SOURCE_ENGINES: Record<string, string> = {
  'University of Ottawa': 'workday',
  'University of Toronto': 'jobs2web',
  UBC: 'workday',
  'Brock University': 'workday',
  'York University': 'technomedia',
  'City of Vaughan': 'njoyn',
  'City of Oshawa': 'njoyn',
  "Queen's University": 'njoyn',
  'Metrolinx': 'oracle',
  'Government of Canada': 'custom',
  'Toronto District School Board': 'custom',
};

const SOURCE_TITLE_RULE_SOURCES = new Set([
  'University of Ottawa',
  'Humber College',
  'Government of Canada',
  'Toronto District School Board',
  'Northumberland County',
  'Shared Health Manitoba',
  'Metrolinx',
  'Toronto Metropolitan University',
  'Brock University',
  'University of Toronto',
  'UBC',
  'University of Northern British Columbia',
  'York University',
  'City of Waterloo',
  'City of Burlington',
  'City of Oshawa',
  "Queen's University",
  'University of Winnipeg',
  'City of Hamilton',
  'City of Windsor',
  'City of Thunder Bay',
  'City of Cornwall',
  'Conservation Halton',
  'Defence Construction Canada',
]);

export const PARSER_RULES: readonly ParserRuleDefinition[] = [
  {
    id: 'global.title.normalize',
    scope: 'global',
    description: 'Normalize whitespace and universally invalid title metadata.',
  },
  {
    id: 'source.title.normalize-source-metadata',
    scope: 'source',
    description: 'Apply the exact source title profile after shared normalization.',
  },
];

export function parserContext(source: string, engine?: string | null): ParserContext {
  return { source, engine: engine ?? SOURCE_ENGINES[source] ?? null };
}

export function sourceEngine(source: string): string | null {
  return SOURCE_ENGINES[source] ?? null;
}

/** Narrowest scope wins: source > engine > global. */
export function resolveParserRules(context: ParserContext): ParserRuleDefinition[] {
  const rules = PARSER_RULES.filter(rule => {
    if (rule.scope === 'source') return SOURCE_TITLE_RULE_SOURCES.has(context.source);
    if (rule.scope === 'engine') return rule.engine === context.engine;
    return true;
  });
  return rules.sort((a, b) => scopeRank(b.scope) - scopeRank(a.scope));
}

function scopeRank(scope: ParserRuleScope): number {
  return scope === 'source' ? 3 : scope === 'engine' ? 2 : 1;
}

/**
 * Shared title entry point for fresh parses and audits. The raw capture is
 * passed through separately because source pages can contain a better title
 * than the model response.
 */
export function applyParserTitleRules(
  context: ParserContext,
  title: string | null | undefined,
  rawText?: string | null,
): ParsedTitleResult {
  const original = String(title ?? '');
  let normalized = normalizeJobTitle(original);
  const ruleIds: string[] = [];
  if (normalized !== original.replace(/\s+/g, ' ').trim()) ruleIds.push('global.title.normalize');

  // Keep the existing source normalizer in the parse path for every source:
  // it also contains the shared higher-education term handling. The registry
  // only labels known source profiles; it must not accidentally narrow an
  // existing safe normalizer while the profiles are being migrated.
  const sourceNormalized = normalizeSourceJobTitle(context.source, normalized);
  if (sourceNormalized !== normalized && SOURCE_TITLE_RULE_SOURCES.has(context.source)) {
    ruleIds.push('source.title.normalize-source-metadata');
  }
  normalized = sourceNormalized;

  if (rawText) {
    const rawNormalized = normalizeSourceJobTitleFromRaw(context.source, normalized, rawText);
    if (rawNormalized !== normalized) {
      ruleIds.push(SOURCE_TITLE_RULE_SOURCES.has(context.source)
        ? 'source.title.normalize-source-metadata'
        : 'global.title.normalize');
    }
    normalized = rawNormalized;
  }

  return { title: normalized, ruleIds: [...new Set(ruleIds)] };
}
