import { useMemo, useState } from 'react';
import { daysUntilClose } from '../../../utils';
import type { Job, ListingTypeFilter, View } from '../../../types/jobs';
import type { CareerStage } from '../careerStage';
import { CLOSING_SOON_DAYS, groupJobsByCompany, isExpired, jobFreshnessTimestamp, parseJobDetails, parseTagList } from '../jobUtils';

export function parseLocationTerms(value: string): string[] {
  return [...new Set(value.split(/[,;]+/).map(term => term.trim().toLowerCase()).filter(Boolean))];
}

export function matchesLocation(location: string | null | undefined, filter: string): boolean {
  const terms = parseLocationTerms(filter);
  if (terms.length === 0) return true;
  const normalizedLocation = (location || '').toLowerCase();
  return terms.some(term => normalizedLocation.includes(term));
}

const ANNUALIZATION_FACTORS: Record<string, number> = {
  hourly: 2_080,
  daily: 260,
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  yearly: 1,
};

/** Convert supported pay periods to an approximate yearly equivalent. */
export function annualizedSalaryMinimum(
  salaryMin: number | null | undefined,
  salaryPeriod: string | null | undefined,
): number | null {
  if (salaryMin === null || salaryMin === undefined || !Number.isFinite(salaryMin)) return null;
  const factor = ANNUALIZATION_FACTORS[String(salaryPeriod ?? '').trim().toLowerCase()];
  return factor === undefined ? null : Math.round(salaryMin * factor * 100) / 100;
}

export function matchesSalaryMinimum(
  salaryMin: number | null | undefined,
  salaryPeriod: string | null | undefined,
  minimum: number | null,
): boolean {
  if (minimum === null) return true;
  const annualizedMinimum = annualizedSalaryMinimum(salaryMin, salaryPeriod);
  return annualizedMinimum !== null && annualizedMinimum >= minimum;
}

export function useJobFilters(jobs: Job[], currentView: View, searchTerm: string) {
  const [minSalary, setMinSalary] = useState<number | null>(null);
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [locationTerm, setLocationTerm] = useState('');
  const [deadlineDays, setDeadlineDays] = useState<number | null>(null);
  const [listingTypeFilter, setListingTypeFilter] = useState<ListingTypeFilter>(null);
  const [showStudentJobs, setShowStudentJobs] = useState(false);
  const [showAcademicJobs, setShowAcademicJobs] = useState(false);
  const [selectedCareerStages, setSelectedCareerStages] = useState<CareerStage[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [vehicleRequired, setVehicleRequired] = useState(false);
  const [sortNewest, setSortNewest] = useState(false);
  const [newlyAdded, setNewlyAdded] = useState(false);
  const [now] = useState(() => Date.now());
  const locationTerms = parseLocationTerms(locationTerm);

  const filteredJobs = useMemo(() => {
    const pool = currentView === 'saved' ? jobs.filter(job => job.is_saved) : jobs.filter(job => !isExpired(job));
    const filtered = pool.filter(job => {
      if (listingTypeFilter === 'inventory' && !job.is_inventory) return false;
      if (listingTypeFilter === 'ongoing_recruitment' && job.listing_type !== 'ongoing_recruitment') return false;
      if (listingTypeFilter === null && job.is_inventory) return false;
      if (showStudentJobs && !job.is_student) return false;
      if (showAcademicJobs && !job.academic_role_type) return false;
      if (selectedCareerStages.length > 0 && (!job.career_stage || !selectedCareerStages.includes(job.career_stage))) return false;
      const query = searchTerm.toLowerCase();
      const matchesSearch = [job.job_title, job.department, job.source]
        .some(value => (value || '').toLowerCase().includes(query));
      const matchesLocation = locationTerms.length === 0 || locationTerms.some(term => (job.location || '').toLowerCase().includes(term));
      const details = parseJobDetails(job);
      const matchesMode = selectedModes.length === 0 || (details.mode !== null && selectedModes.includes(details.mode));
      const matchesSalary = matchesSalaryMinimum(job.salary_min, job.salary_period, minSalary);
      const languageRequirements = parseTagList(job.language_requirements);
      const matchesLanguage = selectedLanguages.length === 0 || selectedLanguages.every(language => languageRequirements.some(value => {
        const normalized = value.toLowerCase();
        return normalized.includes(language.toLowerCase()) || normalized.includes('bilingual');
      }));
      const matchesVehicle = !vehicleRequired || Number(job.vehicle_required) === 1;
      const days = daysUntilClose(job.closing_date);
      const matchesDeadline = deadlineDays === null
        || (deadlineDays === -1 ? days === null : days !== null && days >= 0 && days <= deadlineDays);
      const cutoff = now - 7 * 24 * 60 * 60 * 1000;
      const matchesNew = !newlyAdded || jobFreshnessTimestamp(job, now) >= cutoff;
      return matchesSearch && matchesLocation && matchesMode && matchesSalary && matchesLanguage && matchesVehicle && matchesDeadline && matchesNew;
    });
    return filtered.sort((a, b) => {
      if (sortNewest) return jobFreshnessTimestamp(b, now) - jobFreshnessTimestamp(a, now);
      const aDays = daysUntilClose(a.closing_date);
      const bDays = daysUntilClose(b.closing_date);
      const aUrgent = aDays !== null && aDays >= 0 && aDays <= CLOSING_SOON_DAYS;
      const bUrgent = bDays !== null && bDays >= 0 && bDays <= CLOSING_SOON_DAYS;
      if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
      if (aUrgent && bUrgent) return (aDays ?? 0) - (bDays ?? 0);
      return jobFreshnessTimestamp(b, now) - jobFreshnessTimestamp(a, now);
    });
  }, [jobs, currentView, searchTerm, locationTerms, minSalary, selectedModes, selectedLanguages, vehicleRequired, deadlineDays, listingTypeFilter, showStudentJobs, showAcademicJobs, selectedCareerStages, sortNewest, newlyAdded, now]);

  const jobsByCompany = useMemo(() => groupJobsByCompany(jobs), [jobs]);
  const activeJobsByCompany = useMemo(() => Object.fromEntries(
    Object.entries(jobsByCompany).map(([name, companyJobs]) => [name, companyJobs.filter(job => !isExpired(job))])
      .filter(([, companyJobs]) => companyJobs.length > 0)
  ), [jobsByCompany]);
  const activeCompanies = useMemo(() => Object.keys(activeJobsByCompany).sort(), [activeJobsByCompany]);
  const inactiveCompanies = useMemo(() => Object.keys(jobsByCompany)
    .filter(name => !jobsByCompany[name].some(job => !isExpired(job))).sort(), [jobsByCompany]);
  const recentJobs = useMemo(() => jobs.filter(job => !isExpired(job))
    .sort((a, b) => jobFreshnessTimestamp(b) - jobFreshnessTimestamp(a)).slice(0, 5), [jobs]);
  const availableJobs = useMemo(() => jobs.filter(job => !isExpired(job) && !job.is_inventory), [jobs]);
  const recentlyAddedCount = useMemo(() => {
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    return availableJobs.filter(job => jobFreshnessTimestamp(job, now) >= cutoff).length;
  }, [availableJobs, now]);
  const closingSoonJobs = useMemo(() => jobs.filter(job => !isExpired(job))
    .map(job => ({ job, days: daysUntilClose(job.closing_date) ?? 999 }))
    .filter(({ days }) => days >= 0).sort((a, b) => a.days - b.days).slice(0, 5).map(({ job }) => job), [jobs]);

  const resetFilters = () => {
    setMinSalary(null); setLocationTerm(''); setSelectedModes([]); setSelectedLanguages([]); setVehicleRequired(false); setDeadlineDays(null); setListingTypeFilter(null); setShowStudentJobs(false); setShowAcademicJobs(false); setSelectedCareerStages([]); setSortNewest(false); setNewlyAdded(false);
  };

  return {
    minSalary, setMinSalary, locationTerm, setLocationTerm, selectedModes, setSelectedModes, deadlineDays, setDeadlineDays,
    listingTypeFilter, setListingTypeFilter, showStudentJobs, setShowStudentJobs, showAcademicJobs, setShowAcademicJobs, selectedCareerStages, setSelectedCareerStages, selectedLanguages, setSelectedLanguages, vehicleRequired, setVehicleRequired,
    sortNewest, setSortNewest, newlyAdded, setNewlyAdded, filteredJobs,
    recentJobs, closingSoonJobs, availableJobCount: availableJobs.length, recentlyAddedCount,
    jobsByCompany, activeJobsByCompany, activeCompanies, inactiveCompanies, resetFilters,
  };
}
