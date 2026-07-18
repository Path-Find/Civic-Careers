import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  return <div className="filter-section">
    <button className={`filter-toggle ${isOpen ? 'filter-toggle-open' : ''}`} onClick={() => setIsOpen(open => !open)}>
      <span className="filter-title">{title}</span>{isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
    </button>
    {isOpen && <div className="filter-options">{children}</div>}
  </div>;
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button className={`filter-button ${active ? 'active' : ''}`} onClick={onClick}>{label}</button>;
}

export function JobFiltersSidebar({
  headerHeight, minSalary, selectedModes, closingSoon, showInventories,
  onMinSalaryChange, onModesChange, onClosingSoonChange, onInventoriesChange, onReset,
}: {
  headerHeight: number;
  minSalary: number | null;
  selectedModes: string[];
  closingSoon: boolean;
  showInventories: boolean;
  onMinSalaryChange: (value: number | null) => void;
  onModesChange: (mode: string) => void;
  onClosingSoonChange: () => void;
  onInventoriesChange: () => void;
  onReset: () => void;
}) {
  return <aside style={{ display: 'flex', flexDirection: 'column', position: 'sticky', top: `${headerHeight + 20}px`, alignSelf: 'start' }}>
    <div className="filter-heading"><span className="filter-heading-label">Filters</span></div>
    <FilterSection title="Salary Min">{[50000, 75000, 100000, 125000].map(value => <FilterButton key={value} label={`$${value / 1000}k+`} active={minSalary === value} onClick={() => onMinSalaryChange(minSalary === value ? null : value)} />)}</FilterSection>
    <FilterSection title="Work Mode">{['In-person', 'Hybrid', 'Remote'].map(mode => <FilterButton key={mode} label={mode} active={selectedModes.includes(mode)} onClick={() => onModesChange(mode)} />)}</FilterSection>
    <FilterSection title="Deadline"><FilterButton label="Closing soon" active={closingSoon} onClick={onClosingSoonChange} /></FilterSection>
    <FilterSection title="Job Type"><FilterButton label="Ongoing/Inventory" active={showInventories} onClick={onInventoriesChange} /></FilterSection>
    <div className="filter-reset-wrap"><button className="filter-reset" onClick={onReset}>Reset filters</button></div>
  </aside>;
}
