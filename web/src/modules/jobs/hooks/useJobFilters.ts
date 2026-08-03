import { useMemo, useState } from 'react';
import { daysUntilClose } from '../../../utils';
import type { Job, View } from '../../../types/jobs';
import { CLOSING_SOON_DAYS, groupJobsByCompany, isExpired, jobFreshnessTimestamp, parseJobDetails } from '../jobUtils';

export function useJobFilters(jobs: Job[], currentView: View, searchTerm: string) {
  const [minSalary, setMinSalary] = useState<number | null>(null);
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [locationTerm, setLocationTerm] = useState('');
  const [deadlineDays, setDeadlineDays] = useState<number | null>(null);
  const [showInventories, setShowInventories] = useState(false);
  const [showStudentJobs, setShowStudentJobs] = useState(false);
  const [sortNewest, setSortNewest] = useState(false);
  const [newlyAdded, setNewlyAdded] = useState(false);
  const [now] = useState(() => Date.now());

  const filteredJobs = useMemo(() => {
    const pool = currentView === 'saved' ? jobs.filter(job => job.is_saved) : jobs.filter(job => !isExpired(job));
    const filtered = pool.filter(job => {
      if (!showInventories && job.is_inventory) return false;
      if (showStudentJobs && !job.is_student) return false;
      const query = searchTerm.toLowerCase();
      const matchesSearch = [job.job_title, job.department, job.source]
        .some(value => (value || '').toLowerCase().includes(query));
      const matchesLocation = !locationTerm || (job.location || '').toLowerCase().includes(locationTerm.toLowerCase());
      const details = parseJobDetails(job);
      const matchesMode = selectedModes.length === 0 || (details.mode !== null && selectedModes.includes(details.mode));
      const matchesSalary = !minSalary || (job.salary_min !== null && job.salary_min >= minSalary);
      const days = daysUntilClose(job.closing_date);
      const matchesDeadline = deadlineDays === null
        || (deadlineDays === -1 ? days === null : days !== null && days >= 0 && days <= deadlineDays);
      const cutoff = now - 7 * 24 * 60 * 60 * 1000;
      const matchesNew = !newlyAdded || jobFreshnessTimestamp(job, now) >= cutoff;
      return matchesSearch && matchesLocation && matchesMode && matchesSalary && matchesDeadline && matchesNew;
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
  }, [jobs, currentView, searchTerm, locationTerm, minSalary, selectedModes, deadlineDays, showInventories, showStudentJobs, sortNewest, newlyAdded, now]);

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
    setMinSalary(null); setLocationTerm(''); setSelectedModes([]); setDeadlineDays(null); setShowInventories(false); setShowStudentJobs(false); setSortNewest(false); setNewlyAdded(false);
  };

  return {
    minSalary, setMinSalary, locationTerm, setLocationTerm, selectedModes, setSelectedModes, deadlineDays, setDeadlineDays,
    showInventories, setShowInventories, showStudentJobs, setShowStudentJobs, sortNewest, setSortNewest, newlyAdded, setNewlyAdded, filteredJobs,
    recentJobs, closingSoonJobs, availableJobCount: availableJobs.length, recentlyAddedCount,
    jobsByCompany, activeJobsByCompany, activeCompanies, inactiveCompanies, resetFilters,
  };
}
