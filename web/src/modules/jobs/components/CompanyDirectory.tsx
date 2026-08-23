import type { MouseEvent } from 'react';
import type { CompanySummary } from '../../../types/jobs';
import { slugify } from '../../../utils';
import { publicOrganizationName } from '../organizationMetadata';

const COMPANY_DISPLAY_NAMES: Record<string, string> = {
  CMHC: 'Canada Mortgage and Housing Corporation',
  TRCA: 'Toronto and Region Conservation Authority',
  TTC: 'Toronto Transit Commission',
};

function companyDisplayName(name: string): string {
  return COMPANY_DISPLAY_NAMES[name] ?? publicOrganizationName(name);
}

export function CompanyDirectory({ companies, sort, showArchived, onSelectCompany }: {
  companies: CompanySummary[];
  sort: 'alphabetical' | 'mostJobs' | 'recent';
  showArchived: boolean;
  onSelectCompany: (company: CompanySummary) => void;
}) {
  // Sort by what the user sees (display name), not the internal source key
  // (CMHC / TTC), so A–Z is real alphabetical order.
  const sortCompanies = (items: CompanySummary[]) => [...items].sort((a, b) => {
    const byDisplay = companyDisplayName(a.name).localeCompare(companyDisplayName(b.name), undefined, { sensitivity: 'base' });
    if (sort === 'mostJobs') return Number(b.active_job_count) - Number(a.active_job_count) || byDisplay;
    if (sort === 'recent') return (b.latest_job_added_at ?? '').localeCompare(a.latest_job_added_at ?? '') || byDisplay;
    return byDisplay;
  });
  const activeCompanies = sortCompanies(companies.filter(company => Number(company.active_job_count) > 0));
  const inactiveCompanies = sortCompanies(companies.filter(company => Number(company.active_job_count) === 0));
  const companyHref = (company: CompanySummary) => `/companies/${company.organizationSlug ?? slugify(company.name)}`;
  const handleCompanyClick = (event: MouseEvent<HTMLAnchorElement>, company: CompanySummary) => {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      onSelectCompany(company);
    }
  };
  return <>
    {activeCompanies.map(company => <a className="company-row" key={company.name} href={companyHref(company)} onClick={event => handleCompanyClick(event, company)}><div><span className="company-name">{companyDisplayName(company.name)}</span>{company.children && company.children.length > 0 && <span className="company-child-summary">Includes {company.children.map(child => child.name).join(', ')}</span>}</div><span className="company-count">{company.active_job_count} positions</span></a>)}
    {showArchived && inactiveCompanies.length > 0 && <>
      <div className="company-section-label">Not currently hiring</div>
      {inactiveCompanies.map(company => <a className="company-row archived" key={company.name} href={companyHref(company)} onClick={event => handleCompanyClick(event, company)}><div><span className="company-name">{companyDisplayName(company.name)}</span>{company.children && company.children.length > 0 && <span className="company-child-summary">Includes {company.children.map(child => child.name).join(', ')}</span>}</div><span className="company-count">{company.total_job_count} positions (archived)</span></a>)}
    </>}
  </>;
}
