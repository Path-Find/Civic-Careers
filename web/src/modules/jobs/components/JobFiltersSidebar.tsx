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
  headerHeight, minSalary, locationTerm, selectedModes, deadlineDays, showInventories, showStudentJobs,
  onMinSalaryChange, onLocationChange, onModesChange, onDeadlineChange, onInventoriesChange, onStudentJobsChange, onReset,
}: {
  headerHeight: number;
  minSalary: number | null;
  locationTerm: string;
  selectedModes: string[];
  deadlineDays: number | null;
  showInventories: boolean;
  showStudentJobs: boolean;
  onMinSalaryChange: (value: number | null) => void;
  onLocationChange: (value: string) => void;
  onModesChange: (mode: string) => void;
  onDeadlineChange: (days: number | null) => void;
  onInventoriesChange: () => void;
  onStudentJobsChange: () => void;
  onReset: () => void;
}) {
  return <aside className="listing-sidebar" style={{ top: `${headerHeight + 20}px` }}>
    <div className="filter-heading"><span className="filter-heading-label">Filters</span></div>
    <div className="filter-section"><label className="filter-title" htmlFor="location-filter">Location</label><input id="location-filter" className="location-filter-input" value={locationTerm} onChange={event => onLocationChange(event.target.value)} placeholder="e.g. Toronto" /></div>
    <FilterSection title="Salary Min">{[50000, 75000, 100000, 125000].map(value => <FilterButton key={value} label={`$${value / 1000}k+`} active={minSalary === value} onClick={() => onMinSalaryChange(minSalary === value ? null : value)} />)}</FilterSection>
    <FilterSection title="Work Mode">{['In-person', 'Hybrid', 'Remote'].map(mode => <FilterButton key={mode} label={mode} active={selectedModes.includes(mode)} onClick={() => onModesChange(mode)} />)}</FilterSection>
    <FilterSection title="Deadline"><FilterButton label="Today" active={deadlineDays === 0} onClick={() => onDeadlineChange(deadlineDays === 0 ? null : 0)} /><FilterButton label="Within 7 days" active={deadlineDays === 7} onClick={() => onDeadlineChange(deadlineDays === 7 ? null : 7)} /><FilterButton label="Within 14 days" active={deadlineDays === 14} onClick={() => onDeadlineChange(deadlineDays === 14 ? null : 14)} /><FilterButton label="Within 30 days" active={deadlineDays === 30} onClick={() => onDeadlineChange(deadlineDays === 30 ? null : 30)} /><FilterButton label="No closing date" active={deadlineDays === -1} onClick={() => onDeadlineChange(deadlineDays === -1 ? null : -1)} /></FilterSection>
    <FilterSection title="Job Type"><FilterButton label="Student/Co-op" active={showStudentJobs} onClick={onStudentJobsChange} /><FilterButton label="Ongoing/Inventory" active={showInventories} onClick={onInventoriesChange} /></FilterSection>
    <div className="filter-reset-wrap"><button className="filter-reset" onClick={onReset}>Reset filters</button></div>
  </aside>;
}
