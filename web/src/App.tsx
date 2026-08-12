import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { inject } from '@vercel/analytics';
import { jobIdFromPath, jobRoute, slugify } from './utils';
import type { Job, ListingTypeFilter, View } from './types/jobs';
import { normalizeJobTitle, parseJobDetails } from './modules/jobs/jobUtils';
import { useJobs } from './modules/jobs/hooks/useJobs';
import { useJobFilters } from './modules/jobs/hooks/useJobFilters';
import { useRecentlyViewed } from './modules/jobs/hooks/useRecentlyViewed';
import { JobRow } from './modules/jobs/components/JobRow';
import { JobFiltersSidebar } from './modules/jobs/components/JobFiltersSidebar';
import { JobDetailView } from './modules/jobs/components/JobDetailView';
import { HomeQuickFilters } from './modules/jobs/components/HomeQuickFilters';
import { LocationPrompt } from './modules/jobs/components/LocationPrompt';
import { CompanyDirectory } from './modules/jobs/components/CompanyDirectory';
import { CompanyTitleSuggestions } from './modules/jobs/components/CompanyTitleSuggestions';
import { CompanyFiltersSidebar } from './modules/jobs/components/CompanyFiltersSidebar';
import { ListSortControls } from './modules/jobs/components/ListSortControls';
import { companyPortal, companyTypes, type CompanyType } from './modules/jobs/companyTypes';

import { Search, ExternalLink, X } from 'lucide-react';

inject();

function formatCheckedAt(timestamp: string | null) {
  if (!timestamp) return 'Not available';
  const date = new Date(`${timestamp.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? 'Not available' : new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function LoadingState({ view }: { view: View }) {
  const isListingView = view === 'jobs' || view === 'saved' || view === 'companies';
  const rowCount = view === 'companies' ? 8 : 10;

  return (
    <div className={isListingView ? 'listing-layout loading-layout' : 'single-column-layout'} aria-busy="true">
      {isListingView && <aside className="listing-sidebar loading-sidebar">
        <div className="loading-pulse loading-sidebar-heading" />
        {Array.from({ length: view === 'companies' ? 3 : 5 }, (_, index) => <div className="loading-pulse loading-sidebar-row" key={index} />)}
      </aside>}
      <div className={view === 'home' ? 'home-preview loading-list' : 'loading-list'}>
        <div className="loading-toolbar">
          <div className="loading-pulse loading-toolbar-count" />
          <div className="loading-toolbar-buttons">
            {Array.from({ length: 3 }, (_, index) => <div className="loading-pulse loading-toolbar-button" key={index} />)}
          </div>
        </div>
        {Array.from({ length: rowCount }, (_, index) => (
          <div className="loading-job-row" key={index}>
            <div className="loading-pulse loading-job-title" />
            <div className="loading-pulse loading-job-meta" />
          </div>
        ))}
      </div>
    </div>
  );
}

type JobUrlState = {
  searchTerm: string;
  locationTerm: string;
  minSalary: number | null;
  selectedModes: string[];
  selectedLanguages: string[];
  vehicleRequired: boolean;
  deadlineDays: number | null;
  listingTypeFilter: ListingTypeFilter;
  showStudentJobs: boolean;
  sortNewest: boolean;
  newlyAdded: boolean;
};

const VALID_MODES = ['In-person', 'Hybrid', 'Remote'] as const;
const VALID_LANGUAGES = ['English', 'French'] as const;
const VALID_SALARIES = [50000, 75000, 100000, 125000] as const;
const VALID_DEADLINES = [0, 7, 14, 30, -1] as const;
const JOB_FILTER_QUERY_KEYS = ['search', 'location', 'salary', 'mode', 'language', 'vehicle', 'student', 'closing', 'listing', 'sort', 'added'];

const EMPTY_JOB_URL_STATE: JobUrlState = {
  searchTerm: '',
  locationTerm: '',
  minSalary: null,
  selectedModes: [],
  selectedLanguages: [],
  vehicleRequired: false,
  deadlineDays: null,
  listingTypeFilter: null,
  showStudentJobs: false,
  sortNewest: false,
  newlyAdded: false,
};

function validValues<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]) {
  return [...new Set(params.getAll(key).filter((value): value is T => allowed.includes(value as T)))];
}

function parseJobUrlState(search: string): JobUrlState {
  const params = new URLSearchParams(search);
  const salary = Number(params.get('salary'));
  const rawDeadline = params.get('closing');
  const deadline = Number(rawDeadline);
  const deadlineDays = rawDeadline !== null && VALID_DEADLINES.includes(deadline as typeof VALID_DEADLINES[number]) ? deadline : null;
  const newlyAdded = params.get('added') === '7' && deadlineDays === null;

  return {
    searchTerm: params.get('search') ?? '',
    locationTerm: params.get('location') ?? '',
    minSalary: VALID_SALARIES.includes(salary as typeof VALID_SALARIES[number]) ? salary : null,
    selectedModes: validValues(params, 'mode', VALID_MODES),
    selectedLanguages: validValues(params, 'language', VALID_LANGUAGES),
    vehicleRequired: params.get('vehicle') === '1',
    deadlineDays,
    listingTypeFilter: params.get('listing') === 'inventory' || params.get('listing') === 'ongoing_recruitment'
      ? params.get('listing') as Exclude<ListingTypeFilter, null>
      : null,
    showStudentJobs: params.get('student') === '1',
    sortNewest: params.get('sort') === 'newest' && deadlineDays === null && !newlyAdded,
    newlyAdded,
  };
}

function replaceJobFiltersInUrl(state: JobUrlState) {
  const url = new URL(window.location.href);
  JOB_FILTER_QUERY_KEYS.forEach(key => url.searchParams.delete(key));
  if (state.searchTerm) url.searchParams.set('search', state.searchTerm);
  if (state.locationTerm) url.searchParams.set('location', state.locationTerm);
  if (state.minSalary !== null) url.searchParams.set('salary', String(state.minSalary));
  [...state.selectedModes].sort().forEach(mode => url.searchParams.append('mode', mode));
  [...state.selectedLanguages].sort().forEach(language => url.searchParams.append('language', language));
  if (state.vehicleRequired) url.searchParams.set('vehicle', '1');
  if (state.showStudentJobs) url.searchParams.set('student', '1');
  if (state.deadlineDays !== null) url.searchParams.set('closing', String(state.deadlineDays));
  if (state.listingTypeFilter) url.searchParams.set('listing', state.listingTypeFilter);
  if (state.sortNewest) url.searchParams.set('sort', 'newest');
  if (state.newlyAdded) url.searchParams.set('added', '7');

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl !== currentUrl) window.history.replaceState(window.history.state, '', nextUrl);
}

function App() {
  const { jobs, homeData, companySummaries, companyTitleSuggestions, loading, loadingMore, jobsTotal, jobsAvailableTotal, jobsSource, jobsOrganization, setServerFilters, loadMore, refresh, loadDescription, toggleSaved } = useJobs();
  const { recentlyViewedJobs, recordViewed, clearRecentlyViewed } = useRecentlyViewed(jobs);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [currentView, setCurrentView] = useState<View>('home');
  const [companySort, setCompanySort] = useState<'alphabetical' | 'mostJobs' | 'recent'>('alphabetical');
  const [companyStatus, setCompanyStatus] = useState<'hiring' | 'all'>('hiring');
  const [selectedCompanyTypes, setSelectedCompanyTypes] = useState<CompanyType[]>([]);
  const [companyTitleFilter, setCompanyTitleFilter] = useState<string | null>(null);
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const [locationPromptCity, setLocationPromptCity] = useState(() => {
    try {
      return window.localStorage.getItem('civic-careers-near-city') ?? '';
    } catch {
      return '';
    }
  });
  const [locationPromptError, setLocationPromptError] = useState<string | null>(null);
  const [locationPromptRequesting, setLocationPromptRequesting] = useState(false);
  const filters = useJobFilters(jobs, currentView, searchTerm);
  const {
    minSalary, setMinSalary, locationTerm, setLocationTerm, selectedModes, setSelectedModes, deadlineDays, setDeadlineDays,
    listingTypeFilter, setListingTypeFilter, showStudentJobs, setShowStudentJobs, selectedLanguages, setSelectedLanguages, vehicleRequired, setVehicleRequired,
    sortNewest, setSortNewest, newlyAdded, setNewlyAdded, filteredJobs,
    recentJobs, availableJobCount, recentlyAddedCount,
  } = filters;
  const homeRecentJobs = homeData?.recentJobs ?? recentJobs;
  const displayAvailableJobCount = homeData?.availableJobCount ?? availableJobCount;
  const displayRecentlyAddedCount = homeData?.recentlyAddedCount ?? recentlyAddedCount;
  const latestJobCheckedAt = jobs.reduce<string | null>((latest, job) => {
    if (!job.last_checked_at) return latest;
    return !latest || job.last_checked_at > latest ? job.last_checked_at : latest;
  }, null);
  const lastCheckedAt = homeData?.lastCheckedAt ?? latestJobCheckedAt;
  // jobsSource is set by the scoped company-page API fetch — no need to mirror it into searchTerm.
  const isCompanyPage = currentView === 'jobs' && Boolean(jobsSource);
  const companyTitleOptions = [...new Set(companyTitleSuggestions.map(normalizeJobTitle).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .slice(0, 20);
  const companyCareersPortal = jobsOrganization?.portal ?? (jobsSource ? companyPortal(jobsSource) : null);
  const companyFilteredJobs = isCompanyPage && companyTitleFilter
    ? filteredJobs.filter(job => normalizeJobTitle(job.job_title) === companyTitleFilter)
    : filteredJobs;
  // deadlineDays + newlyAdded are applied server-side (full corpus + accurate total).
  // Other filters still run client-side on loaded pages only.
  const hasClientOnlyFilters = Boolean(
    (!isCompanyPage && searchTerm)
    || locationTerm
    || selectedModes.length > 0
    || selectedLanguages.length > 0
    || vehicleRequired
    || minSalary
    || showStudentJobs
    || listingTypeFilter
    || companyTitleFilter
  );
  const hasJobFilters = hasClientOnlyFilters || deadlineDays !== null || newlyAdded;
  // Prefer API totals whenever no client-only filters are active (includes deadline / newly-added / company scope).
  const displayedJobCount = currentView === 'jobs' && !hasClientOnlyFilters
    ? jobsAvailableTotal
    : companyFilteredJobs.length;

  /** Keep useJobs server filter ref in sync, then optionally re-fetch the list. */
  const applyServerListFilters = (next: { deadlineDays: number | null; newlyAdded: boolean }, shouldRefresh: boolean) => {
    setServerFilters(next);
    if (shouldRefresh) refresh();
  };
  const isListingView = currentView === 'jobs' || currentView === 'saved' || currentView === 'companies';
  const filteredCompanySummaries = companySummaries.filter(company => selectedCompanyTypes.length === 0 || selectedCompanyTypes.some(type => companyTypes(company.name).includes(type)));
  const visibleCompanySummaries = companyStatus === 'hiring'
    ? filteredCompanySummaries.filter(company => Number(company.active_job_count) > 0)
    : filteredCompanySummaries;

  // Sticky sidebars offset by the header's real height (it grows on the job
  // detail page), not a guessed pixel value.
  const headerRef = useRef<HTMLElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const urlHydratedRef = useRef(false);
  const [headerHeight, setHeaderHeight] = useState(80);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setHeaderHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || currentView !== 'jobs' || jobs.length >= jobsTotal) {
      return;
    }
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (entry?.isIntersecting) void loadMore();
    }, { rootMargin: '600px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentView, jobs.length, jobsTotal, loadMore]);

  // Sync state with browser history
  useEffect(() => {
    const applyJobUrlState = (state: JobUrlState) => {
      setSearchTerm(state.searchTerm);
      setLocationTerm(state.locationTerm);
      setMinSalary(state.minSalary);
      setSelectedModes(state.selectedModes);
      setSelectedLanguages(state.selectedLanguages);
      setVehicleRequired(state.vehicleRequired);
      setDeadlineDays(state.deadlineDays);
      setListingTypeFilter(state.listingTypeFilter);
      setShowStudentJobs(state.showStudentJobs);
      setSortNewest(state.sortNewest);
      setNewlyAdded(state.newlyAdded);
      setServerFilters({ deadlineDays: state.deadlineDays, newlyAdded: state.newlyAdded });
    };

    const handlePopState = (shouldRefresh: boolean) => {
      const path = window.location.pathname;
      const isJobListPath = path === '/jobs' || path === '/saved';
      applyJobUrlState(isJobListPath ? parseJobUrlState(window.location.search) : EMPTY_JOB_URL_STATE);
      if (path.startsWith('/job/')) {
        const jobId = jobIdFromPath(path);
        const legacyRid = jobId && /^\d+$/.test(jobId) ? Number(jobId) : null;
        const job = jobId
          ? jobs.find(candidate => candidate.id === jobId || (legacyRid !== null && candidate.rid === legacyRid))
          : undefined;
        if (job) {
          const publicPath = jobRoute(String(job.rid));
          if (path !== publicPath) window.history.replaceState({ jobId: job.rid }, '', publicPath);
          setSelectedJob(job);
        }
      } else if (path === '/saved') {
        setCurrentView('saved');
        setSelectedJob(null);
      } else if (path.startsWith('/companies/')) {
        setCurrentView('jobs');
        setCompanyTitleFilter(null);
        setSelectedJob(null);
      } else if (path === '/companies') {
        setCurrentView('companies');
        setSearchTerm('');
        setSelectedJob(null);
      } else if (path === '/about') {
        setCurrentView('about');
        setSearchTerm('');
        setSelectedJob(null);
      } else if (path === '/jobs') {
        setCurrentView('jobs');
        setSelectedJob(null);
      } else {
        if (jobs.length <= 1) refresh();
        setCurrentView('home');
        setSelectedJob(null);
      }
      if (shouldRefresh && path === '/jobs') refresh();
      urlHydratedRef.current = true;
    };
    const onPopState = () => handlePopState(true);
    window.addEventListener('popstate', onPopState);
    handlePopState(!urlHydratedRef.current);
    window.scrollTo(0, 0);
    return () => window.removeEventListener('popstate', onPopState);
  }, [jobs, refresh, setDeadlineDays, setListingTypeFilter, setLocationTerm, setMinSalary, setNewlyAdded, setSelectedLanguages, setSelectedModes, setServerFilters, setShowStudentJobs, setSortNewest, setVehicleRequired]);

  useEffect(() => {
    if (!urlHydratedRef.current || selectedJob || (currentView !== 'jobs' && currentView !== 'saved')) return;
    if (window.location.pathname !== '/jobs' && window.location.pathname !== '/saved') return;
    replaceJobFiltersInUrl({
      searchTerm,
      locationTerm,
      minSalary,
      selectedModes,
      selectedLanguages,
      vehicleRequired,
      deadlineDays,
      listingTypeFilter,
      showStudentJobs,
      sortNewest,
      newlyAdded,
    });
  }, [currentView, selectedJob, searchTerm, locationTerm, minSalary, selectedModes, selectedLanguages, vehicleRequired, deadlineDays, listingTypeFilter, showStudentJobs, sortNewest, newlyAdded]);

  useEffect(() => {
    if (!selectedJob) return;
    recordViewed(selectedJob);
    if (selectedJob.description) return;
    loadDescription(selectedJob).then(description => {
      if (description) setSelectedJob(prev => prev && prev.id === selectedJob.id ? { ...prev, description } : prev);
    });
  }, [selectedJob, loadDescription, recordViewed]);

  const handleNavigate = (view: View, companyFilter?: string, companySlug?: string) => {
    setCurrentView(view);
    setSelectedJob(null);
    setCompanyTitleFilter(null);
    window.scrollTo(0, 0);
    if (companyFilter) {
      setSearchTerm(companyFilter);
      window.history.pushState(null, '', `/companies/${companySlug ?? slugify(companyFilter)}`);
    } else {
      window.history.pushState(null, '', `/${view === 'home' ? '' : view}`);
    }
    refresh();
  };

  const applyLocationFilter = (city: string) => {
    const trimmedCity = city.trim();
    if (!trimmedCity) return;
    try {
      window.localStorage.setItem('civic-careers-near-city', trimmedCity);
    } catch {
      // Private browsing may block local storage; the active filter still works.
    }
    setLocationTerm(trimmedCity);
    setLocationPromptCity(trimmedCity);
    setLocationPromptOpen(false);
    setLocationPromptError(null);
    if (currentView !== 'jobs') handleNavigate('jobs');
    else refresh();
  };

  const reverseGeocodeCity = async (latitude: number, longitude: number) => {
    const params = new URLSearchParams({ format: 'jsonv2', zoom: '10', addressdetails: '1', lat: String(latitude), lon: String(longitude) });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
    if (!response.ok) throw new Error('City lookup failed');
    const data = await response.json() as { address?: Record<string, string> };
    const address = data.address ?? {};
    const city = address.city || address.town || address.municipality || address.village;
    if (!city) throw new Error('City lookup failed');
    return city;
  };

  const requestNearMe = () => {
    setLocationPromptOpen(true);
    setLocationPromptError(null);
    if (!navigator.geolocation) {
      setLocationPromptRequesting(false);
      setLocationPromptError('Browser location is not available. Enter your city below.');
      return;
    }
    setLocationPromptRequesting(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        reverseGeocodeCity(position.coords.latitude, position.coords.longitude)
          .then(applyLocationFilter)
          .catch(() => {
            setLocationPromptRequesting(false);
            setLocationPromptError('We could not identify your city. Enter it below.');
          });
      },
      () => {
        setLocationPromptRequesting(false);
        setLocationPromptError('Location permission was not granted. Enter your city below.');
      },
      { enableHighAccuracy: false, maximumAge: 60 * 60 * 1000, timeout: 10000 },
    );
  };

  const handleSelectJob = (job: Job) => {
    if (!job.is_active) return;
    setSelectedJob(job);
    window.scrollTo(0, 0);
    window.history.pushState({ jobId: job.rid }, '', jobRoute(String(job.rid)));
  };

  const toggleSaveJob = async (job: Job, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const is_saved = await toggleSaved(job);
      if (is_saved !== null) {
        if (selectedJob?.id === job.id) {
          setSelectedJob(prev => prev ? { ...prev, is_saved } : null);
        }
      }
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  const currentJobDetails = selectedJob ? parseJobDetails(selectedJob) : null;

  const reset = () => {
    setSelectedJob(null); setCurrentView('home'); setSearchTerm(''); setSelectedModes([]); setSelectedLanguages([]); setVehicleRequired(false); setMinSalary(null); setDeadlineDays(null); setListingTypeFilter(null); setSortNewest(false); setNewlyAdded(false);
    setLocationTerm(''); setShowStudentJobs(false); setSelectedCompanyTypes([]); setCompanyTitleFilter(null);
    setServerFilters({ deadlineDays: null, newlyAdded: false });
    window.history.pushState(null, '', '/');
    refresh();
  };

  const applyMostRecentSort = (navigateToJobs: boolean) => {
    setSortNewest(true);
    setDeadlineDays(null);
    setNewlyAdded(false);
    setServerFilters({ deadlineDays: null, newlyAdded: false });
    if (navigateToJobs) handleNavigate('jobs');
    else refresh();
  };
  const applyClosingSoonSort = (navigateToJobs: boolean) => {
    setSortNewest(false);
    setDeadlineDays(14);
    setNewlyAdded(false);
    setServerFilters({ deadlineDays: 14, newlyAdded: false });
    if (navigateToJobs) handleNavigate('jobs');
    else refresh();
  };
  const applyNewlyAddedSort = (navigateToJobs: boolean) => {
    setSortNewest(false);
    setDeadlineDays(null);
    setNewlyAdded(true);
    setServerFilters({ deadlineDays: null, newlyAdded: true });
    if (navigateToJobs) handleNavigate('jobs');
    else refresh();
  };
  const handleDeadlineChange = (days: number | null) => {
    setDeadlineDays(days);
    // Mutual exclusivity with "newly added" chip when picking a deadline from the sidebar
    if (days !== null && newlyAdded) setNewlyAdded(false);
    const nextNewly = days !== null ? false : newlyAdded;
    applyServerListFilters({ deadlineDays: days, newlyAdded: nextNewly }, currentView === 'jobs');
  };

  return (
    <div className="app-shell">
      {/* Universal Sticky Header */}
      <header ref={headerRef} className="app-header">
        <div className="app-header-inner">
          <div className="app-header-grid">
          <h1 onClick={reset} className="app-logo">Civic Careers</h1>

            <div className="app-nav-wrap">
              <nav className="app-nav">
                <span
                  onClick={() => {
                    setSortNewest(false);
                    setDeadlineDays(null);
                    setNewlyAdded(false);
                    setServerFilters({ deadlineDays: null, newlyAdded: false });
                    handleNavigate('jobs');
                  }}
                  className={`app-nav-link ${(currentView === 'jobs' && !selectedJob) ? 'active' : ''}`}
                >
                  Jobs
                </span>
                <span
                  onClick={() => handleNavigate('companies')}
                  className={`app-nav-link ${(currentView === 'companies' && !selectedJob) ? 'active' : ''}`}
                >
                  Companies
                </span>
                <div className="app-nav-divider" />
                <span
                  onClick={() => handleNavigate('saved')}
                  className={`app-nav-link ${(currentView === 'saved' && !selectedJob) ? 'active' : ''}`}
                >
                  Saved
                </span>
              </nav>

              {/* Permanent Search Input */}
              <div className="search-wrap">
                <Search size={16} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search positions..." 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (currentView !== 'jobs' && currentView !== 'companies') {
                      setCurrentView('jobs');
                      window.history.pushState(null, '', '/jobs');
                    }
                  }}
                  className="search-input"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0f172a';
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="search-clear"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      </header>

      {selectedJob ? (
        <JobDetailView job={selectedJob} details={currentJobDetails!} headerHeight={headerHeight} onNavigate={handleNavigate} onToggleSave={toggleSaveJob} />
      ) : (
        <main className="feed-main page-transition">
          {loading ? (
            <LoadingState view={currentView} />
          ) : currentView === 'about' ? (
            <section className="about-page">
              <h2>About Civic Careers</h2>
              <p>Civic Careers brings public-sector and education jobs together in one searchable place.</p>
              <p>Listings come from official employer career pages. We collect the job details and show the original application link.</p>
              <p>{displayAvailableJobCount.toLocaleString()} jobs are currently available, including {displayRecentlyAddedCount.toLocaleString()} added in the last 7 days.</p>
              <p>Last checked: {formatCheckedAt(lastCheckedAt)}</p>
            </section>
          ) : currentView === 'home' ? (
            <section className="home-preview">
              <div className="home-preview-heading">
                <HomeQuickFilters deadlineDays={deadlineDays} newlyAdded={newlyAdded} locationTerm={locationTerm} closingSoonCount={homeData?.closingSoonCount} newlyAddedCount={displayRecentlyAddedCount} nearMeCount={homeData?.nearMeCount} onClosingSoon={() => applyClosingSoonSort(true)} onNewlyAdded={() => applyNewlyAddedSort(true)} onNearMe={requestNearMe} />
                <div className="home-stats" aria-label="Job totals">
                  <div className="home-stat-primary"><strong>{displayAvailableJobCount.toLocaleString()}</strong> jobs available</div>
                  <div><strong>+{displayRecentlyAddedCount.toLocaleString()}</strong> last 7 days</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {homeRecentJobs.map(job => <JobRow key={job.id} job={job} onClick={() => handleSelectJob(job)} />)}
              </div>
              <button className="home-see-all" onClick={() => handleNavigate('jobs')}>See all jobs</button>
            </section>
          ) : (
            <div className={isListingView ? 'listing-layout' : 'single-column-layout'}>
              {currentView === 'companies' ? (
                <CompanyFiltersSidebar
                  status={companyStatus}
                  selectedTypes={selectedCompanyTypes}
                  onStatusChange={setCompanyStatus}
                  onTypeToggle={type => setSelectedCompanyTypes(previous => previous.includes(type) ? previous.filter(value => value !== type) : [...previous, type])}
                />
              ) : (
                <JobFiltersSidebar
                  headerHeight={headerHeight}
                  minSalary={minSalary}
                  locationTerm={locationTerm}
                  selectedModes={selectedModes}
                  selectedLanguages={selectedLanguages}
                  vehicleRequired={vehicleRequired}
                  deadlineDays={deadlineDays}
                  listingTypeFilter={listingTypeFilter}
                  showStudentJobs={showStudentJobs}
                  onMinSalaryChange={setMinSalary}
                  onLocationChange={setLocationTerm}
                  onModesChange={mode => setSelectedModes(prev => prev.includes(mode) ? prev.filter(value => value !== mode) : [...prev, mode])}
                  onLanguageChange={language => setSelectedLanguages(previous => previous.includes(language) ? previous.filter(value => value !== language) : [...previous, language])}
                  onVehicleRequiredChange={() => setVehicleRequired(previous => !previous)}
                  onDeadlineChange={handleDeadlineChange}
                  onListingTypeChange={setListingTypeFilter}
                  onStudentJobsChange={() => setShowStudentJobs(!showStudentJobs)}
                  onReset={reset}
                />
              )}

              <div style={{ minWidth: 0 }}>
                <div className="list-heading-row" style={{ top: `${headerHeight}px` }}>
                  <div className="list-count-label">
                  {currentView === 'companies' ? `${visibleCompanySummaries.length.toLocaleString()} ${companyStatus === 'hiring' ? 'hiring ' : ''}companies` : currentView === 'saved' ? `${filteredJobs.length.toLocaleString()} saved jobs` : hasJobFilters ? `${displayedJobCount.toLocaleString()} matches found` : `${displayedJobCount.toLocaleString()} jobs available`}
                  </div>
                  {currentView === 'companies' && <div className="company-sort-options"><button className={companySort === 'alphabetical' ? 'active' : ''} onClick={() => setCompanySort('alphabetical')}>A–Z</button><button className={companySort === 'mostJobs' ? 'active' : ''} onClick={() => setCompanySort('mostJobs')}>Most jobs</button><button className={companySort === 'recent' ? 'active' : ''} onClick={() => setCompanySort('recent')}>Recently added</button></div>}
                  {currentView === 'jobs' && <ListSortControls sortNewest={sortNewest} deadlineDays={deadlineDays} newlyAdded={newlyAdded} onMostRecent={() => applyMostRecentSort(false)} onClosingSoon={() => applyClosingSoonSort(false)} onNewlyAdded={() => applyNewlyAddedSort(false)} />}
                </div>
                {isCompanyPage && (
                  <div className="company-page-header">
                    <div>
                      <h2 className="company-page-title">{jobsSource}</h2>
                      {companyCareersPortal ? <a className="company-page-portal" href={companyCareersPortal} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={14} />
                          Visit Official Careers Site
                        </a> : <p className="company-page-portal-missing">Official careers link not recorded</p>}
                      {jobsOrganization && jobsOrganization.children.length > 0 && <div className="company-child-links">
                        <span className="company-child-links-label">Includes</span>
                        {jobsOrganization.children.map(child => <a key={child.name} href={child.portal} target="_blank" rel="noopener noreferrer">{child.name} <ExternalLink size={12} /></a>)}
                      </div>}
                    </div>
                    <CompanyTitleSuggestions
                      titles={companyTitleOptions}
                      selectedTitle={companyTitleFilter}
                      onSelect={title => setCompanyTitleFilter(previous => previous === title ? null : title)}
                      onClear={() => setCompanyTitleFilter(null)}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {(currentView === 'jobs' || currentView === 'saved') ? (
                    <>
                      {companyFilteredJobs.map(job => <JobRow key={job.id} job={job} onClick={() => handleSelectJob(job)} />)}
                      {currentView === 'saved' && <section className="recently-viewed-section">
                        <div className="recently-viewed-heading-row">
                          <h2 className="list-count-label recently-viewed-heading">Recently viewed</h2>
                          {recentlyViewedJobs.length > 0 && <button className="recently-viewed-clear" onClick={clearRecentlyViewed}>Clear recently viewed</button>}
                        </div>
                        {recentlyViewedJobs.length > 0
                          ? recentlyViewedJobs.map(job => <JobRow key={job.id} job={job} onClick={() => handleSelectJob(job)} />)
                          : <p className="recently-viewed-empty">Jobs you open will appear here for 30 days.</p>}
                      </section>}
                    </>
                  ) : <>
                    <CompanyDirectory
                      companies={filteredCompanySummaries}
                      sort={companySort}
                      showArchived={companyStatus === 'all'}
                      onSelectCompany={company => {
                        setMinSalary(null);
                        setSelectedModes([]);
                        setDeadlineDays(null);
                        setNewlyAdded(false);
                        setServerFilters({ deadlineDays: null, newlyAdded: false });
                        handleNavigate('jobs', company.name, company.organizationSlug);
                      }}
                    />
                  </>}
                </div>
                {currentView === 'jobs' && jobs.length < jobsTotal && <div ref={loadMoreRef} className="load-more-sentinel" aria-hidden="true" />}
                {currentView === 'jobs' && loadingMore && <div className="load-more-status">Loading more jobs...</div>}
              </div>
            </div>
          )}
        </main>
      )}
      {locationPromptOpen && <LocationPrompt city={locationPromptCity} error={locationPromptError} requesting={locationPromptRequesting} onCityChange={setLocationPromptCity} onSubmit={() => applyLocationFilter(locationPromptCity)} onRetry={requestNearMe} onClose={() => { setLocationPromptOpen(false); setLocationPromptRequesting(false); }} />}
      <footer className="app-footer">
        <div className="app-footer-inner">
          <div className="app-footer-left"><span>© 2026 Civic Careers</span></div>
          <div className="app-footer-right"><button className="app-footer-link" onClick={() => handleNavigate('about')}>About</button></div>
        </div>
      </footer>
    </div>
  );
}

export default App;
