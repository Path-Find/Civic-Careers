import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ListingTypeFilter } from '../../../types/jobs';

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
  headerHeight, minSalary, locationTerm, selectedModes, selectedLanguage, vehicleRequired, deadlineDays, listingTypeFilter, showStudentJobs,
  onMinSalaryChange, onLocationChange, onModesChange, onLanguageChange, onVehicleRequiredChange, onDeadlineChange, onListingTypeChange, onStudentJobsChange, onReset,
}: {
  headerHeight: number;
  minSalary: number | null;
  locationTerm: string;
  selectedModes: string[];
  selectedLanguage: string | null;
  vehicleRequired: boolean;
  deadlineDays: number | null;
  listingTypeFilter: ListingTypeFilter;
  showStudentJobs: boolean;
  onMinSalaryChange: (value: number | null) => void;
  onLocationChange: (value: string) => void;
  onModesChange: (mode: string) => void;
  onLanguageChange: (language: string) => void;
  onVehicleRequiredChange: () => void;
  onDeadlineChange: (days: number | null) => void;
  onListingTypeChange: (value: ListingTypeFilter) => void;
  onStudentJobsChange: () => void;
  onReset: () => void;
}) {
  return <aside className="listing-sidebar" style={{ top: `${headerHeight + 20}px` }}>
    <div className="filter-heading"><span className="filter-heading-label">Filters</span></div>
    <div className="filter-section"><label className="filter-title" htmlFor="location-filter">Location</label><input id="location-filter" className="location-filter-input" value={locationTerm} onChange={event => onLocationChange(event.target.value)} placeholder="e.g. Toronto" /></div>
    <FilterSection title="Salary Min">{[50000, 75000, 100000, 125000].map(value => <FilterButton key={value} label={`$${value / 1000}k+`} active={minSalary === value} onClick={() => onMinSalaryChange(minSalary === value ? null : value)} />)}</FilterSection>
    <FilterSection title="Work Mode">{['In-person', 'Hybrid', 'Remote'].map(mode => <FilterButton key={mode} label={mode} active={selectedModes.includes(mode)} onClick={() => onModesChange(mode)} />)}</FilterSection>
    <FilterSection title="Language">{['English', 'French', 'Bilingual'].map(language => <FilterButton key={language} label={language} active={selectedLanguage === language} onClick={() => onLanguageChange(language)} />)}</FilterSection>
    <FilterSection title="Vehicle"><FilterButton label="Vehicle required" active={vehicleRequired} onClick={onVehicleRequiredChange} /></FilterSection>
    <FilterSection title="Deadline"><FilterButton label="Today" active={deadlineDays === 0} onClick={() => onDeadlineChange(deadlineDays === 0 ? null : 0)} /><FilterButton label="Within 7 days" active={deadlineDays === 7} onClick={() => onDeadlineChange(deadlineDays === 7 ? null : 7)} /><FilterButton label="Within 14 days" active={deadlineDays === 14} onClick={() => onDeadlineChange(deadlineDays === 14 ? null : 14)} /><FilterButton label="Within 30 days" active={deadlineDays === 30} onClick={() => onDeadlineChange(deadlineDays === 30 ? null : 30)} /><FilterButton label="No closing date" active={deadlineDays === -1} onClick={() => onDeadlineChange(deadlineDays === -1 ? null : -1)} /></FilterSection>
    <FilterSection title="Job Type">
      <FilterButton label="Student/Co-op" active={showStudentJobs} onClick={onStudentJobsChange} />
      <FilterButton label="Ongoing recruitment" active={listingTypeFilter === 'ongoing_recruitment'} onClick={() => onListingTypeChange(listingTypeFilter === 'ongoing_recruitment' ? null : 'ongoing_recruitment')} />
      <FilterButton label="Candidate inventory" active={listingTypeFilter === 'inventory'} onClick={() => onListingTypeChange(listingTypeFilter === 'inventory' ? null : 'inventory')} />
      {!listingTypeFilter && <p className="filter-note">Candidate inventory listings are hidden by default.</p>}
    </FilterSection>
    <div className="filter-reset-wrap"><button className="filter-reset" onClick={onReset}>Reset filters</button></div>
  </aside>;
}
