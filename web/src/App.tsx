import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { inject } from '@vercel/analytics';
import { slugify } from './utils';
import type { Job, View } from './types/jobs';
import { parseJobDetails } from './modules/jobs/jobUtils';
import { useJobs } from './modules/jobs/hooks/useJobs';
import { useJobFilters } from './modules/jobs/hooks/useJobFilters';
import { JobRow } from './modules/jobs/components/JobRow';
import { JobFiltersSidebar } from './modules/jobs/components/JobFiltersSidebar';
import { JobDetailView } from './modules/jobs/components/JobDetailView';
import { CompanyDirectory } from './modules/jobs/components/CompanyDirectory';

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

function App() {
  const { jobs, loading, refresh, loadDescription, toggleSaved } = useJobs();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [currentView, setCurrentView] = useState<View>('home');
  const filters = useJobFilters(jobs, currentView, searchTerm);
  const {
    minSalary, setMinSalary, selectedModes, setSelectedModes, closingSoon, setClosingSoon,
    showInventories, setShowInventories, setSortNewest, filteredJobs,
    recentJobs, closingSoonJobs, jobsByCompany, activeJobsByCompany, activeCompanies,
    inactiveCompanies,
  } = filters;

  // Sticky sidebars offset by the header's real height (it grows on the job
  // detail page), not a guessed pixel value.
  const headerRef = useRef<HTMLElement>(null);
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
    if (selectedJob.description) return;
    loadDescription(selectedJob).then(description => {
      if (description) setSelectedJob(prev => prev && prev.id === selectedJob.id ? { ...prev, description } : prev);
    });
  }, [selectedJob, loadDescription]);

  const handleNavigate = (view: View, companyFilter?: string) => {
    refresh();
    setCurrentView(view);
    setSelectedJob(null);
    if (companyFilter) {
      setSearchTerm(companyFilter);
      window.history.pushState(null, '', `/companies/${slugify(companyFilter)}`);
    } else {
      window.history.pushState(null, '', `/${view === 'home' ? '' : view}`);
    }
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
    setSelectedJob(null); setCurrentView('home'); setSearchTerm(''); setSelectedModes([]); setMinSalary(null); setClosingSoon(false); setShowInventories(false); setSortNewest(false);
    window.history.pushState(null, '', '/');
  };

  return (
    <div className="app-shell">
      {/* Universal Sticky Header */}
      <header ref={headerRef} className="app-header">
        <div className="app-header-inner">
          <div className="app-header-grid">
            <h1 onClick={reset} className="app-logo">GovJobs</h1>

            <div className="app-nav-wrap">
              <nav className="app-nav">
                <span
                  onClick={() => { setSortNewest(false); setClosingSoon(false); handleNavigate('jobs'); }}
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
        <main className="feed-main">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Loading jobs...</div>
          ) : currentView === 'home' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem' }}>
              <section>
                <div style={{ marginBottom: '2rem' }}>
                   <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>Most Recent Postings</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentJobs.map(job => <JobRow key={job.id} job={job} onClick={() => handleSelectJob(job)} />)}
                </div>
                <button onClick={() => { setSortNewest(true); setClosingSoon(false); handleNavigate('jobs'); }} style={{ marginTop: '2rem', border: 'none', backgroundColor: 'transparent', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', padding: 0 }}>See more →</button>
              </section>

              <section>
                <div style={{ marginBottom: '2rem' }}>
                   <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>Closing Soon</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {closingSoonJobs.map(job => <JobRow key={job.id} job={job} onClick={() => handleSelectJob(job)} />)}
                </div>
                <button onClick={() => { setSortNewest(false); setClosingSoon(true); handleNavigate('jobs'); }} style={{ marginTop: '2rem', border: 'none', backgroundColor: 'transparent', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', padding: 0 }}>See more →</button>
              </section>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: currentView === 'companies' ? '1fr' : '200px 1fr', gap: '4rem' }}>
              {currentView !== 'companies' && (
                <JobFiltersSidebar
                  headerHeight={headerHeight}
                  minSalary={minSalary}
                  selectedModes={selectedModes}
                  closingSoon={closingSoon}
                  showInventories={showInventories}
                  onMinSalaryChange={setMinSalary}
                  onModesChange={mode => setSelectedModes(prev => prev.includes(mode) ? prev.filter(value => value !== mode) : [...prev, mode])}
                  onClosingSoonChange={() => setClosingSoon(!closingSoon)}
                  onInventoriesChange={() => setShowInventories(!showInventories)}
                  onReset={() => { reset(); setShowInventories(false); }}
                />
              )}

              <div style={{ minWidth: 0 }}>
                <div style={{ marginBottom: '1rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {currentView === 'companies' ? `${activeCompanies.length} hiring companies` : (searchTerm || selectedModes.length > 0 || minSalary || closingSoon ? `${filteredJobs.length} matches found` : `${filteredJobs.length} jobs available`)}
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
                    filteredJobs.map(job => <JobRow key={job.id} job={job} onClick={() => handleSelectJob(job)} />)
                  ) : (
                    <CompanyDirectory
                      activeCompanies={activeCompanies}
                      inactiveCompanies={inactiveCompanies}
                      activeJobsByCompany={activeJobsByCompany}
                      jobsByCompany={jobsByCompany}
                      onSelectCompany={name => { setMinSalary(null); setSelectedModes([]); setClosingSoon(false); handleNavigate('jobs', name); }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
