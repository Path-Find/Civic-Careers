import type { Job } from '../../../types/jobs';

export function CompanyDirectory({ activeCompanies, inactiveCompanies, activeJobsByCompany, jobsByCompany, onSelectCompany }: {
  activeCompanies: string[];
  inactiveCompanies: string[];
  activeJobsByCompany: Record<string, Job[]>;
  jobsByCompany: Record<string, Job[]>;
  onSelectCompany: (name: string) => void;
}) {
  return <>
    {activeCompanies.map(name => <div className="company-row" key={name} onClick={() => onSelectCompany(name)}><span className="company-name">{name}</span><span className="company-count">{activeJobsByCompany[name].length} positions</span></div>)}
    {inactiveCompanies.length > 0 && <>
      <div className="company-section-label">Not currently hiring</div>
      {inactiveCompanies.map(name => <div className="company-row archived" key={name} onClick={() => onSelectCompany(name)}><span className="company-name">{name}</span><span className="company-count">{jobsByCompany[name].length} positions (archived)</span></div>)}
    </>}
  </>;
}
