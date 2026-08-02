import type { CompanySummary } from '../../../types/jobs';

const COMPANY_DISPLAY_NAMES: Record<string, string> = {
  CMHC: 'Canada Mortgage and Housing Corporation',
  EFHC: 'University of Windsor',
  TRCA: 'Toronto and Region Conservation Authority',
  TTC: 'Toronto Transit Commission',
};

export function CompanyDirectory({ companies, sort, showArchived, onSelectCompany }: {
  companies: CompanySummary[];
  sort: 'alphabetical' | 'mostJobs' | 'recent';
  showArchived: boolean;
  onSelectCompany: (name: string) => void;
}) {
  const sortCompanies = (items: CompanySummary[]) => [...items].sort((a, b) => {
    if (sort === 'mostJobs') return Number(b.active_job_count) - Number(a.active_job_count) || a.name.localeCompare(b.name);
    if (sort === 'recent') return (b.latest_job_added_at ?? '').localeCompare(a.latest_job_added_at ?? '') || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
  const activeCompanies = sortCompanies(companies.filter(company => Number(company.active_job_count) > 0));
  const inactiveCompanies = sortCompanies(companies.filter(company => Number(company.active_job_count) === 0));
  return <>
    {activeCompanies.map(company => <div className="company-row" key={company.name} onClick={() => onSelectCompany(company.name)}><span className="company-name">{COMPANY_DISPLAY_NAMES[company.name] ?? company.name}</span><span className="company-count">{company.active_job_count} positions</span></div>)}
    {showArchived && inactiveCompanies.length > 0 && <>
      <div className="company-section-label">Not currently hiring</div>
      {inactiveCompanies.map(company => <div className="company-row archived" key={company.name} onClick={() => onSelectCompany(company.name)}><span className="company-name">{COMPANY_DISPLAY_NAMES[company.name] ?? company.name}</span><span className="company-count">{company.total_job_count} positions (archived)</span></div>)}
    </>}
  </>;
}
