import type { ListingTypeFilter } from '../../types/jobs';
import { EDUCATION_LEVELS } from './educationFilters';
import { CAREER_STAGES } from './careerStage';

type SummaryFilters = {
  searchTerm: string;
  locationTerm: string;
  minSalary: number | null;
  selectedModes: string[];
  selectedLanguages: string[];
  vehicleRequired: boolean;
  deadlineDays: number | null;
  listingTypeFilter: ListingTypeFilter;
  showStudentJobs: boolean;
  showAcademicJobs: boolean;
  sortNewest: boolean;
  newlyAdded: boolean;
  selectedCompanyNames: string[];
  selectedEducationLevels: string[];
  educationField: string;
  selectedCareerStages: string[];
};

export function buildFilterSummary(filters: SummaryFilters): string {
  const parts: string[] = [];
  if (filters.searchTerm.trim()) parts.push(`matching “${filters.searchTerm.trim()}”`);
  if (filters.selectedCompanyNames.length > 0) parts.push(`from ${filters.selectedCompanyNames.join(', ')}`);
  if (filters.locationTerm.trim()) parts.push(`in ${filters.locationTerm.trim()}`);
  if (filters.minSalary !== null) parts.push(`with a $${filters.minSalary.toLocaleString()}+ yearly salary`);
  if (filters.selectedEducationLevels.length > 0) {
    const labels = filters.selectedEducationLevels.map(value => EDUCATION_LEVELS.find(level => level.value === value)?.label ?? value);
    parts.push(`requiring ${labels.join(' or ')}`);
  }
  if (filters.educationField.trim()) parts.push(`in ${filters.educationField.trim()}`);
  if (filters.selectedCareerStages.length > 0) {
    const labels = filters.selectedCareerStages.map(value => CAREER_STAGES.find(stage => stage.value === value)?.label ?? value);
    parts.push(`for ${labels.join(' or ').toLowerCase()} roles`);
  }
  if (filters.selectedModes.length > 0) parts.push(`with ${filters.selectedModes.join(' or ').toLowerCase()} work`);
  if (filters.selectedLanguages.length > 0) parts.push(`${filters.selectedLanguages.join(' and ')} language requirements`);
  if (filters.vehicleRequired) parts.push('requiring a vehicle');
  if (filters.showStudentJobs) parts.push('for student or co-op applicants');
  if (filters.showAcademicJobs) parts.push('for academic roles');
  if (filters.listingTypeFilter === 'inventory') parts.push('in candidate inventories');
  if (filters.listingTypeFilter === 'ongoing_recruitment') parts.push('in ongoing recruitment');
  // The deadline control already states this when it is the only active
  // filter; repeat it only when it adds context to another filter.
  if (filters.deadlineDays !== null && parts.length > 0) parts.push(filters.deadlineDays === -1 ? 'without a closing date' : `closing within ${filters.deadlineDays === 0 ? 'today' : `${filters.deadlineDays} days`}`);
  if (filters.newlyAdded) parts.push('added in the last 7 days');
  if (filters.sortNewest) parts.push('sorted by latest posting');
  return parts.length > 0 ? `Showing jobs ${parts.join(' ')}.` : '';
}
