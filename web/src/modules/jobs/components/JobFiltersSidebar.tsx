import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ListingTypeFilter } from '../../../types/jobs';
import type { CompanySummary, Job } from '../../../types/jobs';
import { EDUCATION_LEVELS, type EducationLevel } from '../educationFilters';
import { CAREER_STAGES, type CareerStage } from '../careerStage';

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

function SuggestionList({ suggestions, onSelect }: { suggestions: string[]; onSelect: (value: string) => void }) {
  if (suggestions.length === 0) return null;
  return <div className="filter-suggestions" role="listbox">
    {suggestions.map(value => <button key={value} type="button" className="filter-suggestion" onClick={() => onSelect(value)}>{value}</button>)}
  </div>;
}

export function JobFiltersSidebar({
  headerHeight, jobs, companyOptions, selectedCompanyNames, selectedEducationLevels, educationField, selectedCareerStages, minSalary, locationTerm, selectedModes, selectedLanguages, vehicleRequired, deadlineDays, listingTypeFilter, showStudentJobs,
  onMinSalaryChange, onLocationChange, onModesChange, onLanguageChange, onVehicleRequiredChange, onDeadlineChange, onListingTypeChange, onStudentJobsChange, onCareerStageChange, onCompanyChange, onEducationLevelChange, onEducationFieldChange, onReset,
}: {
  headerHeight: number;
  jobs: Job[];
  companyOptions: CompanySummary[];
  selectedCompanyNames: string[];
  selectedEducationLevels: EducationLevel[];
  educationField: string;
  selectedCareerStages: CareerStage[];
  minSalary: number | null;
  locationTerm: string;
  selectedModes: string[];
  selectedLanguages: string[];
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
  onCareerStageChange: (stage: CareerStage) => void;
  onCompanyChange: (name: string) => void;
  onEducationLevelChange: (level: EducationLevel) => void;
  onEducationFieldChange: (value: string) => void;
  onReset: () => void;
}) {
  const [companyQuery, setCompanyQuery] = useState('');
  const companySuggestions = useMemo(() => companyOptions
    .map(company => company.name)
    .filter(name => !selectedCompanyNames.includes(name))
    .filter(name => name.toLowerCase().includes(companyQuery.trim().toLowerCase()))
    .slice(0, 8), [companyOptions, companyQuery, selectedCompanyNames]);
  const locationSuggestions = useMemo(() => [...new Set(jobs
    .map(job => job.location?.trim() ?? '')
    .filter(location => location.length > 0 && location.length <= 100))]
    .filter(location => location.toLowerCase().includes(locationTerm.split(/[,;]+/).pop()?.trim().toLowerCase() ?? ''))
    .slice(0, 8), [jobs, locationTerm]);
  const selectLocation = (location: string) => {
    const terms = locationTerm.split(/[,;]+/).map(term => term.trim()).filter(Boolean);
    const currentQuery = terms.pop() ?? '';
    const nextTerms = [...terms, location];
    if (!currentQuery && terms.length === 0) nextTerms.splice(0, nextTerms.length, location);
    onLocationChange(nextTerms.join(', '));
  };

  return <aside className="listing-sidebar" style={{ top: `${headerHeight + 20}px`, maxHeight: `calc(100vh - ${headerHeight + 40}px)` }}>
    <div className="filter-heading"><span className="filter-heading-label">Filters</span></div>
    <div className="filter-section"><label className="filter-title" htmlFor="location-filter">Location</label><div className="filter-search-wrap"><input id="location-filter" className="location-filter-input" value={locationTerm} onChange={event => onLocationChange(event.target.value)} placeholder="Search locations" aria-describedby="location-filter-note" /><SuggestionList suggestions={locationSuggestions} onSelect={selectLocation} /></div><p id="location-filter-note" className="filter-note">Type to search. Separate locations with commas.</p></div>
    {companyOptions.length > 0 && <FilterSection title="Employer">
      {selectedCompanyNames.length > 0 && <div className="filter-selected-list">{selectedCompanyNames.map(name => <button key={name} type="button" className="filter-selected" onClick={() => onCompanyChange(name)}>{name} ×</button>)}</div>}
      <div className="filter-search-wrap"><input id="employer-filter" className="location-filter-input" value={companyQuery} onChange={event => setCompanyQuery(event.target.value)} placeholder="Search employers" aria-label="Search employers" /><SuggestionList suggestions={companySuggestions} onSelect={name => { onCompanyChange(name); setCompanyQuery(''); }} /></div>
      <p className="filter-note">Type to find an employer.</p>
    </FilterSection>}
    <FilterSection title="Salary Min (yearly)">
      {[50000, 75000, 100000, 125000].map(value => <FilterButton key={value} label={`$${value / 1000}k+`} active={minSalary === value} onClick={() => onMinSalaryChange(minSalary === value ? null : value)} />)}
      <p className="filter-note">Only yearly salaries are compared. Other pay periods are not converted.</p>
    </FilterSection>
    <FilterSection title="Work Mode">{['In-person', 'Hybrid', 'Remote'].map(mode => <FilterButton key={mode} label={mode} active={selectedModes.includes(mode)} onClick={() => onModesChange(mode)} />)}</FilterSection>
    <FilterSection title="Language">{['English', 'French'].map(language => <FilterButton key={language} label={language} active={selectedLanguages.includes(language)} onClick={() => onLanguageChange(language)} />)}</FilterSection>
    <FilterSection title="Vehicle"><FilterButton label="Vehicle required" active={vehicleRequired} onClick={onVehicleRequiredChange} /></FilterSection>
    <FilterSection title="Education">
      {EDUCATION_LEVELS.map(level => <FilterButton key={level.value} label={level.label} active={selectedEducationLevels.includes(level.value)} onClick={() => onEducationLevelChange(level.value)} />)}
      <label className="filter-title filter-field-label" htmlFor="education-field-filter">Area of study</label>
      <input id="education-field-filter" className="location-filter-input" value={educationField} onChange={event => onEducationFieldChange(event.target.value)} placeholder="e.g. nursing, engineering" />
      <p className="filter-note">Matches the area of study listed in the posting.</p>
    </FilterSection>
    <FilterSection title="Deadline"><FilterButton label="Today" active={deadlineDays === 0} onClick={() => onDeadlineChange(deadlineDays === 0 ? null : 0)} /><FilterButton label="Within 7 days" active={deadlineDays === 7} onClick={() => onDeadlineChange(deadlineDays === 7 ? null : 7)} /><FilterButton label="Within 14 days" active={deadlineDays === 14} onClick={() => onDeadlineChange(deadlineDays === 14 ? null : 14)} /><FilterButton label="Within 30 days" active={deadlineDays === 30} onClick={() => onDeadlineChange(deadlineDays === 30 ? null : 30)} /></FilterSection>
    <FilterSection title="Job Type">
      <FilterButton label="Student/Co-op" active={showStudentJobs} onClick={onStudentJobsChange} />
      <FilterButton label="Ongoing recruitment" active={listingTypeFilter === 'ongoing_recruitment'} onClick={() => onListingTypeChange(listingTypeFilter === 'ongoing_recruitment' ? null : 'ongoing_recruitment')} />
      <FilterButton label="Candidate inventory" active={listingTypeFilter === 'inventory'} onClick={() => onListingTypeChange(listingTypeFilter === 'inventory' ? null : 'inventory')} />
      {!listingTypeFilter && <p className="filter-note">Candidate inventory listings are hidden by default.</p>}
    </FilterSection>
    <FilterSection title="Career stage">
      {CAREER_STAGES.map(stage => <FilterButton key={stage.value} label={stage.label} active={selectedCareerStages.includes(stage.value)} onClick={() => onCareerStageChange(stage.value)} />)}
      <p className="filter-note">We only show a career stage when the posting makes it clear.</p>
    </FilterSection>
    <div className="filter-reset-wrap"><button className="filter-reset" onClick={onReset}>Reset filters</button></div>
  </aside>;
}
