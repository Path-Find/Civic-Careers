import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { inject } from '@vercel/analytics';
import { renderMarkdown, daysUntilClose, slugify, formatDate } from './utils';
import type { Job, JobDetails, View } from './types/jobs';
import { parseJobDetails } from './modules/jobs/jobUtils';
import { useJobs } from './modules/jobs/hooks/useJobs';
import { useJobFilters } from './modules/jobs/hooks/useJobFilters';

import { Search, ExternalLink, ChevronRight, X, ChevronDown, ChevronUp, Bookmark } from 'lucide-react';

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

const JobRow = ({ job, onClick }: { job: Job, onClick: () => void }) => (
  <div 
    onClick={onClick}
    style={{ 
      padding: '0.4rem 0',
      backgroundColor: 'white',
      borderBottom: '1px solid #f8fafc',
      cursor: job.is_active ? 'pointer' : 'default',
      transition: 'opacity 0.1s ease',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '2rem',
      opacity: job.is_active ? 1 : 0.6
    }}
    onMouseEnter={(e) => (e.currentTarget.style.opacity = job.is_active ? '0.7' : '0.6')}
    onMouseLeave={(e) => (e.currentTarget.style.opacity = job.is_active ? '1' : '0.6')}
  >
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.35rem', fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.1rem' }}>
        <span style={{ minWidth: 0 }}>{job.job_title}</span>
        {!job.is_active && (
          <span style={{ whiteSpace: 'nowrap', fontSize: '0.6rem', padding: '0.1rem 0.4rem', backgroundColor: '#f1f5f9', color: '#94a3b8', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.025em', fontWeight: 800 }}>Expired</span>
        )}
        {job.is_inventory === 1 && (
          <span style={{ whiteSpace: 'nowrap', fontSize: '0.6rem', padding: '0.1rem 0.4rem', backgroundColor: '#f0fdf4', color: '#0ea5e9', border: '1px solid #bae6fd', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.025em', fontWeight: 800 }}>Inventory</span>
        )}
        {job.is_student === 1 && (
          <span style={{ whiteSpace: 'nowrap', fontSize: '0.6rem', padding: '0.1rem 0.4rem', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.025em', fontWeight: 800 }}>Student/Co-op</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{job.source}</span>
        {job.department && <span>• {job.department}</span>}
      </div>
    </div>
    
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
      {job.closing_date && (() => {
        const days = daysUntilClose(job.closing_date);
        const urgent = days !== null && days >= 0 && days <= 7;
        return (
          <div style={{ fontSize: '0.75rem', textAlign: 'right', fontWeight: 500, color: urgent ? '#dc2626' : '#94a3b8' }}>
            {urgent ? (days === 0 ? 'Closes today' : days === 1 ? '1 day left' : `${days}d left`) : formatDate(job.closing_date)}
          </div>
        );
      })()}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <ChevronRight size={16} style={{ color: '#cbd5e1' }} />
      </div>
    </div>
  </div>
);

const FilterSection = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', backgroundColor: 'transparent', padding: '0.25rem 0', cursor: 'pointer', marginBottom: isOpen ? '0.35rem' : 0 }}
      >
        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em' }}>{title}</span>
        {isOpen ? <ChevronUp size={12} color="#0f172a" /> : <ChevronDown size={12} color="#0f172a" />}
      </button>
      {isOpen && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>{children}</div>}
    </div>
  );
};

const FilterButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    style={{ 
      padding: '0.25rem 0.5rem', 
      borderRadius: '4px', 
      fontSize: '0.65rem', 
      fontWeight: 600, 
      border: '1px solid',
      borderColor: active ? '#0f172a' : '#e2e8f0',
      backgroundColor: active ? '#0f172a' : 'white',
      color: active ? 'white' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.1s ease'
    }}
  >
    {label}
  </button>
);

const JobDetailView = ({
  job,
  details,
  headerHeight,
  onNavigate,
  onToggleSave,
}: {
  job: Job;
  details: JobDetails;
  headerHeight: number;
  onNavigate: (view: View, companyFilter?: string) => void;
  onToggleSave: (job: Job, event: React.MouseEvent) => void;
}) => (
  <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', width: '100%', boxSizing: 'border-box', flex: 1 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '4rem', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: `${headerHeight + 20}px` }}>
        {job.closing_date && (
          <div style={{ backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '12px', border: '1px solid #fee2e2' }}>
            <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Apply By</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 900, color: '#b91c1c' }}>{formatDate(job.closing_date)}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.75rem 0.5rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8125rem', textDecoration: 'none' }}>
            <ExternalLink size={14} /> Apply
          </a>
          <button onClick={(event) => onToggleSave(job, event)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', backgroundColor: 'white', color: job.is_saved ? '#0f172a' : '#64748b', border: '1px solid #e2e8f0', padding: '0.75rem 0.5rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' }}>
            <Bookmark size={14} fill={job.is_saved ? '#0f172a' : 'transparent'} />
            {job.is_saved ? 'Saved' : 'Save'}
          </button>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { label: 'Department', val: job.department },
            { label: 'Location', val: job.location },
            { label: 'Salary', val: details.salary },
            { label: 'Work Mode', val: details.mode },
            { label: 'Employment', val: details.type },
            { label: 'Duration', val: details.duration },
            { label: 'Union', val: details.union },
            { label: 'Skills / Programs', val: details.skills },
            { label: 'Benefits', val: details.benefits },
            { label: 'Eligibility', val: details.future, highlight: true }
          ].filter(i => i.val).map(item => (
            <div key={item.label}>
              <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.15rem' }}>{item.label}</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: item.highlight ? '#9a3412' : '#1e293b', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{item.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '0' }}>
          <div onClick={() => onNavigate('jobs', job.source)} style={{ color: '#2563eb', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.5rem', cursor: 'pointer' }}>{job.source}</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 1.5rem 0', letterSpacing: '-0.04em', lineHeight: 1.1 }}>{job.job_title}</h1>

          {job.description ? (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#334155', minWidth: 0, overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(job.description) }} />
            </div>
          ) : (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[80, 95, 60, 90, 40].map(width => <div key={width} className="animate-pulse" style={{ height: '1.25rem', backgroundColor: '#f1f5f9', borderRadius: '4px', width: `${width}%` }} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  </main>
);

const JobFiltersSidebar = ({
  headerHeight,
  minSalary,
  selectedModes,
  closingSoon,
  showInventories,
  onMinSalaryChange,
  onModesChange,
  onClosingSoonChange,
  onInventoriesChange,
  onReset,
}: {
  headerHeight: number;
  minSalary: number | null;
  selectedModes: string[];
  closingSoon: boolean;
  showInventories: boolean;
  onMinSalaryChange: (value: number | null) => void;
  onModesChange: (mode: string) => void;
  onClosingSoonChange: () => void;
  onInventoriesChange: () => void;
  onReset: () => void;
}) => (
  <aside style={{ display: 'flex', flexDirection: 'column', position: 'sticky', top: `${headerHeight + 20}px`, alignSelf: 'start' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#0f172a' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters</span>
    </div>
    <FilterSection title="Salary Min">{[50000, 75000, 100000, 125000].map(value => <FilterButton key={value} label={`$${value / 1000}k+`} active={minSalary === value} onClick={() => onMinSalaryChange(minSalary === value ? null : value)} />)}</FilterSection>
    <FilterSection title="Work Mode">{['In-person', 'Hybrid', 'Remote'].map(mode => <FilterButton key={mode} label={mode} active={selectedModes.includes(mode)} onClick={() => onModesChange(mode)} />)}</FilterSection>
    <FilterSection title="Deadline"><FilterButton label="Closing soon" active={closingSoon} onClick={onClosingSoonChange} /></FilterSection>
    <FilterSection title="Job Type"><FilterButton label="Ongoing/Inventory" active={showInventories} onClick={onInventoriesChange} /></FilterSection>
    <div style={{ marginTop: '1.5rem' }}><button onClick={onReset} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'transparent', color: '#64748b', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Reset filters</button></div>
  </aside>
);

const CompanyDirectory = ({
  activeCompanies,
  inactiveCompanies,
  activeJobsByCompany,
  jobsByCompany,
  onSelectCompany,
}: {
  activeCompanies: string[];
  inactiveCompanies: string[];
  activeJobsByCompany: Record<string, Job[]>;
  jobsByCompany: Record<string, Job[]>;
  onSelectCompany: (name: string) => void;
}) => (
  <>
    {activeCompanies.map(name => (
      <div key={name} onClick={() => onSelectCompany(name)} style={{ padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '1rem', fontWeight: 700 }}>{name}</span>
        <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 700 }}>{activeJobsByCompany[name].length} positions</span>
      </div>
    ))}
    {inactiveCompanies.length > 0 && (
      <>
        <div style={{ marginTop: '1rem', marginBottom: '0.25rem', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Not currently hiring</div>
        {inactiveCompanies.map(name => (
          <div key={name} onClick={() => onSelectCompany(name)} style={{ padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>{name}</span>
            <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 700 }}>{jobsByCompany[name].length} positions (archived)</span>
          </div>
        ))}
      </>
    )}
  </>
);

inject();

function App() {
  const { jobs, loading, loadDescription, toggleSaved } = useJobs();
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
        setCurrentView('home');
        setSelectedJob(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    handlePopState();
    return () => window.removeEventListener('popstate', handlePopState);
  }, [jobs]);

  useEffect(() => {
    if (!selectedJob) return;
    if (selectedJob.description) return;
    loadDescription(selectedJob).then(description => {
      if (description) setSelectedJob(prev => prev && prev.id === selectedJob.id ? { ...prev, description } : prev);
    });
  }, [selectedJob, loadDescription]);

  const handleNavigate = (view: View, companyFilter?: string) => {
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
    <div style={{ minHeight: '100vh', backgroundColor: 'white', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Universal Sticky Header */}
      <header ref={headerRef} style={{ borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 50 }}>
        <div style={{ padding: '2rem 2rem 1.5rem 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
            <h1 onClick={reset} style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.04em', cursor: 'pointer', lineHeight: 1 }}>GovJobs</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <nav style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '2rem',
                fontSize: '1rem', 
                fontWeight: 600, 
                color: '#64748b'
              }}>
                <span
                  onClick={() => { setSortNewest(false); setClosingSoon(false); handleNavigate('jobs'); }}
                  style={{ cursor: 'pointer', color: (currentView === 'jobs' && !selectedJob) ? '#0f172a' : 'inherit' }}
                >
                  Jobs
                </span>
                <span
                  onClick={() => handleNavigate('companies')}
                  style={{ cursor: 'pointer', color: (currentView === 'companies' && !selectedJob) ? '#0f172a' : 'inherit' }}
                >
                  Companies
                </span>
                <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0' }} />
                <span
                  onClick={() => handleNavigate('saved')}
                  style={{ cursor: 'pointer', color: (currentView === 'saved' && !selectedJob) ? '#0f172a' : 'inherit' }}
                >
                  Saved
                </span>
              </nav>

              {/* Permanent Search Input */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '220px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
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
                  style={{ 
                    width: '100%', 
                    padding: '0.4rem 0.75rem 0.4rem 2.25rem', 
                    borderRadius: '20px', 
                    border: '1px solid #e2e8f0', 
                    outline: 'none', 
                    fontSize: '0.875rem', 
                    fontWeight: 500, 
                    color: '#0f172a', 
                    backgroundColor: '#f8fafc',
                    transition: 'all 0.15s ease'
                  }}
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
                    style={{ position: 'absolute', right: '0.75rem', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}
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
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', width: '100%', boxSizing: 'border-box', flex: 1 }}>
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
