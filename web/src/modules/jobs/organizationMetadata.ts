/**
 * Maintained relationships between scraper source identities and the public
 * employer or organization they belong to. This is intentionally explicit:
 * source names and titles are not reliable relationship evidence.
 */
export interface OrganizationChild {
  name: string;
  portal: string;
}

export interface OrganizationGroup {
  slug: string;
  name: string;
  sourceNames: string[];
  portal: string | null;
  children: OrganizationChild[];
}

export const ORGANIZATION_GROUPS: OrganizationGroup[] = [
  {
    slug: 'city-of-ottawa',
    name: 'City of Ottawa',
    sourceNames: ['City of Ottawa', 'City of Ottawa (Jobs2Web)'],
    portal: 'https://career47.sapsf.com/careers/cityofottawa/search',
    children: [
      {
        name: 'OC Transpo',
        portal: 'https://jobs-emplois.ottawa.ca/city-jobs/go/OC-Transpo/8649847/',
      },
    ],
  },
  {
    slug: 'wsib',
    name: 'WSIB',
    sourceNames: ['WSIB'],
    portal: 'https://wsib-iaepup.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/jobs?mode=location',
    children: [],
  },
];

/** Convert an internal source identity into the employer label shown to users. */
export function publicOrganizationName(name: string): string {
  return name.replace(/\s*\(Jobs2Web\)\s*$/i, '').trim();
}

export function organizationGroupForSlug(slug: string): OrganizationGroup | null {
  return ORGANIZATION_GROUPS.find(group => group.slug === slug) ?? null;
}

export function organizationGroupForSources(sourceNames: string[]): OrganizationGroup | null {
  const sourceSet = new Set(sourceNames);
  return ORGANIZATION_GROUPS.find(group => group.sourceNames.some(source => sourceSet.has(source))) ?? null;
}
