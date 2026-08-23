import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ListingTypeFilter } from '../../../types/jobs';
import type { CompanySummary, Job } from '../../../types/jobs';
import { EDUCATION_LEVELS, educationFieldOptions, type EducationLevel } from '../educationFilters';
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

function FilterButton({ label, active, onClick, disabled = false }: { label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return <button className={`filter-button ${active ? 'active' : ''}`} onClick={onClick} disabled={disabled}>{label}</button>;
}

function SuggestionList({ suggestions, onSelect }: { suggestions: string[]; onSelect: (value: string) => void }) {
  if (suggestions.length === 0) return null;
  return <div className="filter-suggestions" role="listbox">
    {suggestions.map(value => <button key={value} type="button" className="filter-suggestion" onClick={() => onSelect(value)}>{value}</button>)}
  </div>;
}

function isCanonicalLocation(value: string): boolean {
  return value.split(';').every(part => {
    const location = part.trim();
    return /^[^,;]{2,80},\s*(?:AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)$/i.test(location);
  });
}

export function JobFiltersSidebar({
  headerHeight, jobs, companyOptions, selectedCompanyNames, selectedEducationLevels, educationField, selectedCareerStages, minSalary, locationTerm, selectedModes, selectedLanguages, vehicleRequired, deadlineDays, listingTypeFilter, showStudentJobs, showAcademicJobs, closingSoonDisabled, savedView,
  onMinSalaryChange, onLocationChange, onModesChange, onLanguageChange, onVehicleRequiredChange, onDeadlineChange, onListingTypeChange, onStudentJobsChange, onAcademicJobsChange, onCareerStageChange, onCompanyChange, onEducationLevelChange, onEducationFieldChange, onReset,
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
  showAcademicJobs: boolean;
  closingSoonDisabled: boolean;
  savedView: boolean;
  onMinSalaryChange: (value: number | null) => void;
  onLocationChange: (value: string) => void;
  onModesChange: (mode: string) => void;
  onLanguageChange: (language: string) => void;
  onVehicleRequiredChange: () => void;
  onDeadlineChange: (days: number | null) => void;
  onListingTypeChange: (value: ListingTypeFilter) => void;
  onStudentJobsChange: () => void;
  onAcademicJobsChange: () => void;
  onCareerStageChange: (stage: CareerStage) => void;
  onCompanyChange: (name: string) => void;
  onEducationLevelChange: (level: EducationLevel) => void;
  onEducationFieldChange: (value: string) => void;
  onReset: () => void;
}) {
  const [companyQuery, setCompanyQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [educationQuery, setEducationQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState<'location' | 'company' | 'education' | null>(null);
  const selectedLocations = useMemo(() => locationTerm.split(/[,;]+/).map(value => value.trim()).filter(Boolean), [locationTerm]);
  const companySuggestions = useMemo(() => companyOptions
    .map(company => company.name)
    .filter(name => !selectedCompanyNames.includes(name))
    .filter(name => name.toLowerCase().includes(companyQuery.trim().toLowerCase()))
    .slice(0, 8), [companyOptions, companyQuery, selectedCompanyNames]);
  const locationSuggestions = useMemo(() => [...new Set(jobs
    .map(job => job.location?.trim() ?? '')
    .filter(location => location.length > 0 && location.length <= 100 && isCanonicalLocation(location)))]
    .filter(location => !selectedLocations.includes(location) && location.toLowerCase().includes(locationQuery.trim().toLowerCase()))
    .slice(0, 8), [jobs, selectedLocations, locationQuery]);
  const educationSuggestions = useMemo(() => educationFieldOptions(jobs.map(job => job.education_requirements))
    .filter(value => value.toLowerCase().includes(educationQuery.trim().toLowerCase()))
    .filter(value => value !== educationField)
    .slice(0, 8), [jobs, educationField, educationQuery]);
  const selectLocation = (location: string) => {
    if (!selectedLocations.includes(location)) onLocationChange([...selectedLocations, location].join(', '));
    setLocationQuery('');
  };

  return <aside className="listing-sidebar" style={{ top: `${headerHeight + 20}px`, maxHeight: `calc(100vh - ${headerHeight + 40}px)` }}>
    <div className={`filter-heading ${savedView ? 'saved-filter-heading' : ''}`}><span className="filter-heading-label">Filters</span>{savedView && <p className="saved-filter-note">Filters apply to saved jobs only. Recently viewed jobs stay separate.</p>}</div>
    <div className="filter-section"><label className="filter-title" htmlFor="location-filter">Location</label><div className="filter-search-wrap"><input id="location-filter" className="location-filter-input" value={locationQuery} onFocus={() => setActiveSearch('location')} onChange={event => setLocationQuery(event.target.value)} placeholder="Search locations" /><SuggestionList suggestions={activeSearch === 'location' && locationQuery.trim() ? locationSuggestions : []} onSelect={value => { selectLocation(value); setActiveSearch(null); }} /></div>{selectedLocations.length > 0 && <div className="filter-selected-list">{selectedLocations.map(location => <button key={location} type="button" className="filter-selected" onClick={() => onLocationChange(selectedLocations.filter(value => value !== location).join(', '))}>{location} ×</button>)}</div>}</div>
    {companyOptions.length > 0 && <FilterSection title="Employer">
      <div className="filter-search-wrap"><input id="employer-filter" className="location-filter-input" value={companyQuery} onFocus={() => setActiveSearch('company')} onChange={event => setCompanyQuery(event.target.value)} placeholder="Search employers" aria-label="Search employers" /><SuggestionList suggestions={activeSearch === 'company' && companyQuery.trim() ? companySuggestions : []} onSelect={name => { onCompanyChange(name); setCompanyQuery(''); setActiveSearch(null); }} /></div>
      {selectedCompanyNames.length > 0 && <div className="filter-selected-list">{selectedCompanyNames.map(name => <button key={name} type="button" className="filter-selected" onClick={() => onCompanyChange(name)}>{name} ×</button>)}</div>}
    </FilterSection>}
    <FilterSection title="Salary Min (yearly equivalent)">
      {[50000, 75000, 100000, 125000].map(value => <FilterButton key={value} label={`$${value / 1000}k+`} active={minSalary === value} onClick={() => onMinSalaryChange(minSalary === value ? null : value)} />)}
    </FilterSection>
    <FilterSection title="Work Mode">{['In-person', 'Hybrid', 'Remote'].map(mode => <FilterButton key={mode} label={mode} active={selectedModes.includes(mode)} onClick={() => onModesChange(mode)} />)}</FilterSection>
    <FilterSection title="Language">{['English', 'French'].map(language => <FilterButton key={language} label={language} active={selectedLanguages.includes(language)} onClick={() => onLanguageChange(language)} />)}</FilterSection>
    <FilterSection title="Vehicle"><FilterButton label="Vehicle required" active={vehicleRequired} onClick={onVehicleRequiredChange} /></FilterSection>
    <FilterSection title="Education">
      {EDUCATION_LEVELS.map(level => <FilterButton key={level.value} label={level.label} active={selectedEducationLevels.includes(level.value)} onClick={() => onEducationLevelChange(level.value)} />)}
    </FilterSection>
    <FilterSection title="Area of study">
      <div className="filter-search-wrap"><input id="education-field-filter" className="location-filter-input" value={educationQuery} onFocus={() => setActiveSearch('education')} onChange={event => setEducationQuery(event.target.value)} placeholder="Search areas of study" /><SuggestionList suggestions={activeSearch === 'education' && educationQuery.trim() ? educationSuggestions : []} onSelect={value => { onEducationFieldChange(value); setEducationQuery(''); setActiveSearch(null); }} /></div>
      {educationField && <div className="filter-selected-list"><button type="button" className="filter-selected" onClick={() => onEducationFieldChange('')}>{educationField} ×</button></div>}
    </FilterSection>
    <FilterSection title="Deadline"><FilterButton label="Today" active={deadlineDays === 0} onClick={() => onDeadlineChange(deadlineDays === 0 ? null : 0)} disabled={closingSoonDisabled} /><FilterButton label="Within 7 days" active={deadlineDays === 7} onClick={() => onDeadlineChange(deadlineDays === 7 ? null : 7)} disabled={closingSoonDisabled} /><FilterButton label="Within 14 days" active={deadlineDays === 14} onClick={() => onDeadlineChange(deadlineDays === 14 ? null : 14)} disabled={closingSoonDisabled} /><FilterButton label="Within 30 days" active={deadlineDays === 30} onClick={() => onDeadlineChange(deadlineDays === 30 ? null : 30)} disabled={closingSoonDisabled} />{closingSoonDisabled && <p className="filter-note">These jobs are open until filled, so no closing-date filter applies.</p>}</FilterSection>
    <FilterSection title="Job Type">
      <FilterButton label="Student/Co-op" active={showStudentJobs} onClick={onStudentJobsChange} />
      <FilterButton label="Academic roles" active={showAcademicJobs} onClick={onAcademicJobsChange} />
      <FilterButton label="Ongoing recruitment" active={listingTypeFilter === 'ongoing_recruitment'} onClick={() => onListingTypeChange(listingTypeFilter === 'ongoing_recruitment' ? null : 'ongoing_recruitment')} />
      <FilterButton label="Candidate inventory" active={listingTypeFilter === 'inventory'} onClick={() => onListingTypeChange(listingTypeFilter === 'inventory' ? null : 'inventory')} />
      {!listingTypeFilter && <p className="filter-note">Candidate inventory listings are hidden by default.</p>}
    </FilterSection>
    <FilterSection title="Career stage">
      {CAREER_STAGES.map(stage => <FilterButton key={stage.value} label={stage.label} active={selectedCareerStages.includes(stage.value)} onClick={() => onCareerStageChange(stage.value)} />)}
    </FilterSection>
    <div className="filter-reset-wrap"><button className="filter-reset" onClick={onReset}>Reset filters</button></div>
  </aside>;
}
