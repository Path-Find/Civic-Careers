import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { inject } from '@vercel/analytics';
import { slugify } from './utils';
import type { Job, View } from './types/jobs';
import { parseJobDetails } from './modules/jobs/jobUtils';
import { useJobs } from './modules/jobs/hooks/useJobs';
import { useJobFilters } from './modules/jobs/hooks/useJobFilters';
import { useRecentlyViewed } from './modules/jobs/hooks/useRecentlyViewed';
import { JobRow } from './modules/jobs/components/JobRow';
import { JobFiltersSidebar } from './modules/jobs/components/JobFiltersSidebar';
import { JobDetailView } from './modules/jobs/components/JobDetailView';
import { CompanyDirectory } from './modules/jobs/components/CompanyDirectory';
import { CompanyFiltersSidebar } from './modules/jobs/components/CompanyFiltersSidebar';
import { ListSortControls } from './modules/jobs/components/ListSortControls';
import { companyTypes, type CompanyType } from './modules/jobs/companyTypes';

import { Search, ExternalLink, X } from 'lucide-react';

const COMPANY_PORTALS: Record<string, string> = {
  'City of Toronto': 'https://jobs.toronto.ca/jobsatcity/',
  'Government of Canada': 'https://www.canada.ca/en/public-service-commission/jobs/services/gc-jobs.html',
  'CMHC': 'https://www.cmhc-schl.gc.ca/about-us/careers',
  'University of Toronto': 'https://jobs.utoronto.ca/',
  'Metrolinx': 'https://metrolinx.jibeapply.com/',
  'City of Hamilton': 'https://www.hamilton.ca/city-careers',
  'York Region': 'https://www.york.ca/careers',
  'City of Barrie': 'https://www.barrie.ca/government-contact/careers',
  'Brock University': 'https://brocku.wd3.myworkdayjobs.com/brocku_careers',
  'University of Waterloo': 'https://uwaterloo.wd3.myworkdayjobs.com/uw_careers',
  'University of Ottawa': 'https://uottawa.wd3.myworkdayjobs.com/en-US/uOttawa_External_Career_Site',
  'TTC': 'https://www.ttc.ca/jobs',
  'City of Richmond Hill': 'https://www.richmondhill.ca/en/find-or-learn-about/careers.aspx',
  'Town of Milton': 'https://www.milton.ca/en/work-and-play/careers.aspx',
  'Town of Caledon': 'https://www.caledon.ca/en/government/careers.aspx',
  'City of Brantford': 'https://www.brantford.ca/en/your-government/careers.aspx',
  'City of Waterloo': 'https://www.waterloo.ca/en/government/careers.aspx',
  'City of Cambridge': 'https://www.cambridge.ca/en/your-government/careers.aspx',
  'City of Burlington': 'https://www.burlington.ca/en/your-government/careers.aspx',
  'City of Windsor': 'https://windsor.myrecruitmentplus.com/',
  'City of St. Catharines': 'https://www.stcatharines.ca/en/government/careers.aspx',
  'City of Thunder Bay': 'https://www.thunderbay.ca/en/city-hall/jobs.aspx',
  'OCAD University': 'https://www.ocadu.ca/about/careers',
  'Seneca College': 'https://www.senecacollege.ca/about/careers.html',
  'Town of Oakville': 'https://www.oakville.ca/town-hall/careers/',
  'Algonquin College': 'https://www.algonquincollege.com/hr/careers/',
  'City of London': 'https://www.london.ca/careers',
  'Town of Ajax': 'https://www.ajax.ca/en/inside-town-hall/careers.aspx',
  'City of Peterborough': 'https://www.peterborough.ca/en/city-hall/careers.aspx',
  'City of Niagara Falls': 'https://niagarafalls.ca/city-hall/human-resources/careers/',
  'Town of Whitby': 'https://www.whitby.ca/en/work/careers.aspx',
  'EFHC': 'https://efhc.ca/careers/',
  'CreateTO': 'https://createtg.ca/careers/',
  'City of Welland': 'https://www.welland.ca/hr/jobs.asp',
  'City of Belleville': 'https://www.belleville.ca/en/city-hall/careers.aspx',
  'Waterfront Toronto': 'https://www.waterfrontoronto.ca/about-us/careers',
  'Vaughan Public Library': 'https://www.vaughanpl.info/about/careers',
  'Peel Region': 'https://www.peelregion.ca/jobs/',
  'Durham Region': 'https://www.durham.ca/en/doing-business/careers.aspx',
  'City of Kingston': 'https://www.cityofkingston.ca/city-hall/careers',
  'City of Cornwall': 'https://www.cornwall.ca/en/play-here/careers.aspx',
  'Town of Smiths Falls': 'https://www.smithsfalls.ca/en/town-hall/careers.aspx',
  'City of Oshawa': 'https://www.oshawa.ca/en/city-hall/careers.aspx',
  'City of Vaughan': 'https://www.vaughan.ca/about-city-vaughan/careers',
  'City of Sarnia': 'https://www.sarnia.ca/living-here/careers/',
  'City of St. Thomas': 'https://www.stthomas.ca/city_hall/human_resources/employment_opportunities',
  'Region of Waterloo': 'https://www.regionofwaterloo.ca/en/regional-government/careers.aspx',
  'Halton Region': 'https://www.halton.ca/about-halton/careers',
  'Town of Halton Hills': 'https://www.haltonhills.ca/en/your-government/careers.aspx',
  'Conservation Halton': 'https://www.conservationhalton.ca/careers/'
};

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

function App() {
  const { jobs, homeData, companySummaries, loading, loadingMore, jobsTotal, loadMore, refresh, loadDescription, toggleSaved } = useJobs();
  const { recentlyViewedJobs, recordViewed, clearRecentlyViewed } = useRecentlyViewed(jobs);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [currentView, setCurrentView] = useState<View>('home');
  const [companySort, setCompanySort] = useState<'alphabetical' | 'mostJobs' | 'recent'>('alphabetical');
  const [companyStatus, setCompanyStatus] = useState<'hiring' | 'all'>('hiring');
  const [selectedCompanyTypes, setSelectedCompanyTypes] = useState<CompanyType[]>([]);
  const filters = useJobFilters(jobs, currentView, searchTerm);
  const {
    minSalary, setMinSalary, locationTerm, setLocationTerm, selectedModes, setSelectedModes, deadlineDays, setDeadlineDays,
    showInventories, setShowInventories, showStudentJobs, setShowStudentJobs, sortNewest, setSortNewest, newlyAdded, setNewlyAdded, filteredJobs,
    recentJobs, availableJobCount, recentlyAddedCount, activeCompanies,
    inactiveCompanies,
  } = filters;
  const homeRecentJobs = homeData?.recentJobs ?? recentJobs;
  const displayAvailableJobCount = homeData?.availableJobCount ?? availableJobCount;
  const displayRecentlyAddedCount = homeData?.recentlyAddedCount ?? recentlyAddedCount;
  const latestJobCheckedAt = jobs.reduce<string | null>((latest, job) => {
    if (!job.last_checked_at) return latest;
    return !latest || job.last_checked_at > latest ? job.last_checked_at : latest;
  }, null);
  const lastCheckedAt = homeData?.lastCheckedAt ?? latestJobCheckedAt;
  const hasJobFilters = Boolean(searchTerm || locationTerm || selectedModes.length > 0 || minSalary || deadlineDays !== null || showStudentJobs || showInventories || newlyAdded);
  const displayedJobCount = currentView === 'jobs' && !hasJobFilters ? jobsTotal : filteredJobs.length;
  const isCompanyPage = currentView === 'jobs' && Boolean(searchTerm) && (activeCompanies.includes(searchTerm) || inactiveCompanies.includes(searchTerm));
  const isListingView = currentView === 'jobs' || currentView === 'saved' || currentView === 'companies';
  const filteredCompanySummaries = companySummaries.filter(company => selectedCompanyTypes.length === 0 || selectedCompanyTypes.some(type => companyTypes(company.name).includes(type)));
  const visibleCompanySummaries = companyStatus === 'hiring'
    ? filteredCompanySummaries.filter(company => Number(company.active_job_count) > 0)
    : filteredCompanySummaries;

  // Sticky sidebars offset by the header's real height (it grows on the job
  // detail page), not a guessed pixel value.
  const headerRef = useRef<HTMLElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef(false);
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
    if (!sentinel || currentView !== 'jobs' || searchTerm || jobs.length >= jobsTotal) {
      loadMoreTriggerRef.current = false;
      return;
    }
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (!entry?.isIntersecting) {
        loadMoreTriggerRef.current = false;
        return;
      }
      if (loadMoreTriggerRef.current) return;
      loadMoreTriggerRef.current = true;
      void loadMore();
    }, { rootMargin: '0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentView, searchTerm, jobs.length, jobsTotal, loadMore]);

  // Sync state with browser history
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/job/')) {
        const rid = Number(path.replace('/job/', ''));
        const job = jobs.find(j => j.rid === rid);
        if (job) setSelectedJob(job);
      } else if (path === '/saved') {
        setCurrentView('saved');
        setSelectedJob(null);
      } else if (path.startsWith('/companies/')) {
        const slug = path.replace('/companies/', '');
        // Find matching company from the jobs data by slugifying sources
        const company = Array.from(new Set(jobs.map(j => j.source))).find(name => slugify(name) === slug);
        setCurrentView('jobs');
        if (company) {
          setSearchTerm(company);
        } else {
          setSearchTerm(decodeURIComponent(slug.replace(/-/g, ' ')));
        }
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
    };
    window.addEventListener('popstate', handlePopState);
    handlePopState();
    return () => window.removeEventListener('popstate', handlePopState);
  }, [jobs, refresh]);

  useEffect(() => {
    if (!selectedJob) return;
    recordViewed(selectedJob);
    if (selectedJob.description) return;
    loadDescription(selectedJob).then(description => {
      if (description) setSelectedJob(prev => prev && prev.id === selectedJob.id ? { ...prev, description } : prev);
    });
  }, [selectedJob, loadDescription, recordViewed]);

  const handleNavigate = (view: View, companyFilter?: string) => {
    setCurrentView(view);
    setSelectedJob(null);
    if (companyFilter) {
      setSearchTerm(companyFilter);
      window.history.pushState(null, '', `/companies/${slugify(companyFilter)}`);
    } else {
      window.history.pushState(null, '', `/${view === 'home' ? '' : view}`);
    }
    refresh();
  };

  const handleSelectJob = (job: Job) => {
    if (!job.is_active) return;
    setSelectedJob(job);
    window.history.pushState({ jobId: job.rid }, '', `/job/${job.rid}`);
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
    setSelectedJob(null); setCurrentView('home'); setSearchTerm(''); setSelectedModes([]); setMinSalary(null); setDeadlineDays(null); setShowInventories(false); setSortNewest(false);
    setLocationTerm(''); setShowStudentJobs(false); setSelectedCompanyTypes([]);
    window.history.pushState(null, '', '/');
    refresh();
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
                  onClick={() => { setSortNewest(false); setDeadlineDays(null); handleNavigate('jobs'); }}
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
                <ListSortControls className="list-sort-options" sortNewest={sortNewest} deadlineDays={deadlineDays} newlyAdded={newlyAdded} onMostRecent={() => { setSortNewest(true); setNewlyAdded(false); setDeadlineDays(null); handleNavigate('jobs'); }} onClosingSoon={() => { setSortNewest(false); setNewlyAdded(false); setDeadlineDays(14); handleNavigate('jobs'); }} onNewlyAdded={() => { setSortNewest(false); setNewlyAdded(true); setDeadlineDays(null); handleNavigate('jobs'); }} />
                <div className="home-stats" aria-label="Job totals">
                  <div className="home-stat-primary"><strong>{displayAvailableJobCount.toLocaleString()}</strong> jobs available</div>
                  <div><strong>+{displayRecentlyAddedCount.toLocaleString()}</strong> last 7 days</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {homeRecentJobs.map(job => <JobRow key={job.id} job={job} onClick={() => handleSelectJob(job)} />)}
              </div>
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
                  deadlineDays={deadlineDays}
                  showInventories={showInventories}
                  showStudentJobs={showStudentJobs}
                  onMinSalaryChange={setMinSalary}
                  onLocationChange={setLocationTerm}
                  onModesChange={mode => setSelectedModes(prev => prev.includes(mode) ? prev.filter(value => value !== mode) : [...prev, mode])}
                  onDeadlineChange={setDeadlineDays}
                  onInventoriesChange={() => setShowInventories(!showInventories)}
                  onStudentJobsChange={() => setShowStudentJobs(!showStudentJobs)}
                  onReset={() => { reset(); setShowInventories(false); }}
                />
              )}

              <div style={{ minWidth: 0 }}>
                <div className="list-heading-row" style={{ top: `${headerHeight}px` }}>
                  <div className="list-count-label">
                  {currentView === 'companies' ? `${visibleCompanySummaries.length.toLocaleString()} ${companyStatus === 'hiring' ? 'hiring ' : ''}companies` : currentView === 'saved' ? `${filteredJobs.length.toLocaleString()} saved jobs` : isCompanyPage ? `${filteredJobs.length.toLocaleString()} matches found` : hasJobFilters ? `${displayedJobCount.toLocaleString()} matches found` : `${displayedJobCount.toLocaleString()} jobs available`}
                  </div>
                  {currentView === 'companies' && <div className="company-sort-options"><button className={companySort === 'alphabetical' ? 'active' : ''} onClick={() => setCompanySort('alphabetical')}>A–Z</button><button className={companySort === 'mostJobs' ? 'active' : ''} onClick={() => setCompanySort('mostJobs')}>Most jobs</button><button className={companySort === 'recent' ? 'active' : ''} onClick={() => setCompanySort('recent')}>Recently added</button></div>}
                  {currentView === 'jobs' && <ListSortControls sortNewest={sortNewest} deadlineDays={deadlineDays} newlyAdded={newlyAdded} onMostRecent={() => { setSortNewest(true); setDeadlineDays(null); setNewlyAdded(false); }} onClosingSoon={() => { setSortNewest(false); setDeadlineDays(14); setNewlyAdded(false); }} onNewlyAdded={() => { setSortNewest(false); setDeadlineDays(null); setNewlyAdded(true); }} />}
                </div>
                {currentView === 'jobs' && searchTerm && (activeCompanies.includes(searchTerm) || inactiveCompanies.includes(searchTerm)) && (
                  <div style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#0f172a' }}>{searchTerm}</h2>
                      {COMPANY_PORTALS[searchTerm] && (
                        <a 
                          href={COMPANY_PORTALS[searchTerm]} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#2563eb', fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.4rem', textDecoration: 'none' }}
                        >
                          <ExternalLink size={14} />
                          Visit Official Careers Site
                        </a>
                      )}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {(currentView === 'jobs' || currentView === 'saved') ? (
                    <>
                      {filteredJobs.map(job => <JobRow key={job.id} job={job} onClick={() => handleSelectJob(job)} />)}
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
                      onSelectCompany={name => { setMinSalary(null); setSelectedModes([]); setDeadlineDays(null); handleNavigate('jobs', name); }}
                    />
                  </>}
                </div>
                {currentView === 'jobs' && jobs.length < jobsTotal && !searchTerm && <div ref={loadMoreRef} className="load-more-sentinel" aria-hidden="true" />}
                {currentView === 'jobs' && loadingMore && <div className="load-more-status">Loading more jobs...</div>}
              </div>
            </div>
          )}
        </main>
      )}
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
