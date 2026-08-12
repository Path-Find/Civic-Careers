import type { CompanySummary } from '../../../types/jobs';

const COMPANY_DISPLAY_NAMES: Record<string, string> = {
  CMHC: 'Canada Mortgage and Housing Corporation',
  TRCA: 'Toronto and Region Conservation Authority',
  TTC: 'Toronto Transit Commission',
};

function companyDisplayName(name: string): string {
  return COMPANY_DISPLAY_NAMES[name] ?? name;
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
  return <>
    {activeCompanies.map(company => <div className="company-row" key={company.name} onClick={() => onSelectCompany(company)}><div><span className="company-name">{companyDisplayName(company.name)}</span>{company.children && company.children.length > 0 && <span className="company-child-summary">Includes {company.children.map(child => child.name).join(', ')}</span>}</div><span className="company-count">{company.active_job_count} positions</span></div>)}
    {showArchived && inactiveCompanies.length > 0 && <>
      <div className="company-section-label">Not currently hiring</div>
      {inactiveCompanies.map(company => <div className="company-row archived" key={company.name} onClick={() => onSelectCompany(company)}><div><span className="company-name">{companyDisplayName(company.name)}</span>{company.children && company.children.length > 0 && <span className="company-child-summary">Includes {company.children.map(child => child.name).join(', ')}</span>}</div><span className="company-count">{company.total_job_count} positions (archived)</span></div>)}
    </>}
  </>;
}
