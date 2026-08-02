export function CompanyFiltersSidebar({ status, onStatusChange }: {
  status: 'hiring' | 'all';
  onStatusChange: (status: 'hiring' | 'all') => void;
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
  </aside>;
}
