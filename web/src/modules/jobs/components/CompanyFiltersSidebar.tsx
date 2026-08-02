import { COMPANY_TYPE_OPTIONS, type CompanyType } from '../companyTypes';

export function CompanyFiltersSidebar({ status, selectedTypes, onStatusChange, onTypeToggle }: {
  status: 'hiring' | 'all';
  selectedTypes: CompanyType[];
  onStatusChange: (status: 'hiring' | 'all') => void;
  onTypeToggle: (type: CompanyType) => void;
}) {
  return <aside className="listing-sidebar">
    <div className="filter-heading"><span className="filter-heading-label">Filters</span></div>
    <div className="filter-section">
      <div className="filter-title">Show</div>
      <div className="filter-options">
        <button className={`filter-button ${status === 'hiring' ? 'active' : ''}`} onClick={() => onStatusChange('hiring')}>Currently hiring</button>
        <button className={`filter-button ${status === 'all' ? 'active' : ''}`} onClick={() => onStatusChange('all')}>All companies</button>
      </div>
    </div>
    <div className="filter-section">
      <div className="filter-title">Organization type</div>
      <div className="filter-options">
        {COMPANY_TYPE_OPTIONS.map(option => <button key={option.value} className={`filter-button ${selectedTypes.includes(option.value) ? 'active' : ''}`} onClick={() => onTypeToggle(option.value)}>{option.label}</button>)}
      </div>
    </div>
  </aside>;
}
