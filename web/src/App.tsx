import React, { useEffect, useState, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { inject } from '@vercel/analytics';
import { renderMarkdown, formatSalary, daysUntilClose, fixCasing, slugify, formatDate } from './utils';

const API = import.meta.env.VITE_API_URL ?? '';
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

interface Job {
  id: string;
  job_title: string | null;
  department: string | null;
  location: string | null;
  salary_range: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string | null;
  work_model: string | null;
  employment_type: string | null;
  duration: string | null;
  is_unionized: number | null;
  union_name: string | null;
  benefits: string | null;
  required_skills: string | null;
  description?: string | null;
  closing_date: string | null;
  url: string;
  source: string;
  scraped_at: string;
  is_saved: number;
  is_active: number;
  is_inventory: number;
  is_student: number;
  rid: number;
}

type View = 'home' | 'jobs' | 'saved' | 'companies';

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
      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.1rem' }}>
        {job.job_title}
        {!job.is_active && (
          <span style={{ marginLeft: '0.6rem', fontSize: '0.6rem', padding: '0.1rem 0.4rem', backgroundColor: '#f1f5f9', color: '#94a3b8', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.025em', fontWeight: 800 }}>Expired</span>
        )}
        {job.is_inventory === 1 && (
          <span style={{ marginLeft: '0.6rem', fontSize: '0.6rem', padding: '0.1rem 0.4rem', backgroundColor: '#f0fdf4', color: '#0ea5e9', border: '1px solid #bae6fd', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.025em', fontWeight: 800 }}>Inventory</span>
        )}
        {job.is_student === 1 && (
          <span style={{ marginLeft: '0.6rem', fontSize: '0.6rem', padding: '0.1rem 0.4rem', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.025em', fontWeight: 800 }}>Student/Co-op</span>
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

inject();

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [currentView, setCurrentView] = useState<View>('home');
  
  // Advanced Filters
  const [minSalary, setMinSalary] = useState<number | null>(null);
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [closingSoon, setClosingSoon] = useState(false);
  const [showInventories, setShowInventories] = useState(false);
  const [sortNewest, setSortNewest] = useState(false);

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

  // Lazy-load job description when a job is selected
  useEffect(() => {
    if (!selectedJob) return;
    if (selectedJob.description) return;

    fetch(`${API}/api/jobs?id=${selectedJob.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.description) {
          setSelectedJob(prev => prev && prev.id === selectedJob.id ? { ...prev, description: data.description } : prev);
          setJobs(prev => prev.map(j => j.id === selectedJob.id ? { ...j, description: data.description } : j));
        }
      })
      .catch(err => {
        console.error('Error fetching job description:', err);
      });
  }, [selectedJob]);

  const fetchJobs = () => {
    fetch(`${API}/api/jobs`)
      .then(res => res.json())
      .then(data => {
        const normalized = data.map((j: Job) => ({
          ...j,
          job_title: fixCasing((j.job_title || '')
            .replace(/^Available Position:\s+/i, '')
            .replace(/\(\d+\)\s*$/, '')
            .replace(/\d+$/, '')
            .replace(/ -([A-Z])/, ' - $1')
            .trim()),
          department: (j.department || '')
            .replace(/\(\d+\)/g, '')
            .replace(/\s*[-–—]\s*Job Opportunity.*/i, '')
            .replace(/\s*[-–—].*/, '')
            .replace(/^General$/i, '')
            .trim(),
          closing_date: (j.closing_date || '').replace(/Posted on\s+/i, '').trim(),
          source: j.source === 'WATERFRONT TORONTO' ? 'Waterfront Toronto' : j.source
        }));
        setJobs(normalized);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching jobs:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchJobs();
  }, []);

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
      const res = await fetch(`${API}/api/jobs/${job.id}/toggle-save`, { method: 'POST' });
      if (res.ok) {
        const { is_saved } = await res.json();
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, is_saved } : j));
        if (selectedJob?.id === job.id) {
          setSelectedJob(prev => prev ? { ...prev, is_saved } : null);
        }
      }
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  const joinJsonArray = (raw: string | null): string | null => {
    try { const arr = JSON.parse(raw || '[]'); return Array.isArray(arr) && arr.length ? arr.join(', ') : null; }
    catch { return null; }
  };

  const parseJobDetails = (job: Job) => ({
    salary: formatSalary(job),
    mode: job.work_model === 'On-site' ? 'In-person' : (job.work_model || null),
    type: job.employment_type || null,
    duration: job.duration || null,
    union: job.is_unionized ? (job.union_name || 'Unionized') : null,
    benefits: joinJsonArray(job.benefits),
    skills: joinJsonArray(job.required_skills),
    future: (job.description || '').toLowerCase().includes('future requirements') ? 'Eligible for future requirements' : null,
  });

  const isExpired = useCallback((j: Job): boolean => {
    if (j.is_active === 0) return true;
    if (j.closing_date) {
      const days = daysUntilClose(j.closing_date);
      return days !== null && days < 0;
    }
    return false;
  }, []);

  const CLOSING_SOON_DAYS = 14;

  const filteredJobs = useMemo(() => {
    let pool = jobs;
    if (currentView === 'saved') { pool = jobs.filter(j => j.is_saved); }
    else { pool = pool.filter(j => !isExpired(j)); }
    const filtered = pool.filter(job => {
      if (!showInventories && job.is_inventory) return false;
      const matchesSearch = (job.job_title ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (job.department ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           job.source.toLowerCase().includes(searchTerm.toLowerCase());
      const details = parseJobDetails(job);
      const matchesMode = selectedModes.length === 0 || (details.mode !== null && selectedModes.includes(details.mode));
      let matchesSalary = true;
      if (minSalary) {
        matchesSalary = job.salary_min !== null && job.salary_min >= minSalary;
      }
      let matchesDeadline = true;
      if (closingSoon) {
        const days = daysUntilClose(job.closing_date);
        matchesDeadline = !isExpired(job) && days !== null && days >= 0 && days <= CLOSING_SOON_DAYS;
      }
      return matchesSearch && matchesMode && matchesSalary && matchesDeadline;
    });
    if (sortNewest) return filtered.sort((a, b) => b.scraped_at.localeCompare(a.scraped_at));
    return filtered.sort((a, b) => {
      const dA = daysUntilClose(a.closing_date);
      const dB = daysUntilClose(b.closing_date);
      const urgentA = dA !== null && dA >= 0 && dA <= CLOSING_SOON_DAYS;
      const urgentB = dB !== null && dB >= 0 && dB <= CLOSING_SOON_DAYS;
      if (urgentA && !urgentB) return -1;
      if (!urgentA && urgentB) return 1;
      if (urgentA && urgentB) return (dA ?? 0) - (dB ?? 0);
      return b.scraped_at.localeCompare(a.scraped_at);
    });
  }, [jobs, searchTerm, selectedModes, minSalary, closingSoon, currentView, showInventories, sortNewest, isExpired]);

  const recentJobs = useMemo(() => [...jobs].filter(j => !isExpired(j)).sort((a, b) => b.scraped_at.localeCompare(a.scraped_at)).slice(0, 5), [jobs, isExpired]);
  const closingSoonJobs = useMemo(() => {
    // Show the 5 active jobs closing soonest (any future deadline), for useful home panel
    return jobs
      .filter(j => !isExpired(j))
      .map(j => ({ job: j, days: daysUntilClose(j.closing_date) ?? 999 }))
      .filter(({ days }) => days >= 0)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5)
      .map(({ job }) => job);
  }, [jobs, isExpired]);

  const jobsByCompany = useMemo(() => jobs.reduce((acc, job) => {
    if (!acc[job.source]) acc[job.source] = [];
    acc[job.source].push(job);
    return acc;
  }, {} as Record<string, Job[]>), [jobs]);

  const activeJobsByCompany = useMemo(() => {
    const active: Record<string, Job[]> = {};
    Object.keys(jobsByCompany).forEach(name => {
      const act = jobsByCompany[name].filter(j => !isExpired(j));
      if (act.length > 0) active[name] = act;
    });
    return active;
  }, [jobsByCompany, isExpired]);

  const activeCompanies = useMemo(() => Object.keys(activeJobsByCompany).sort(), [activeJobsByCompany]);
  const inactiveCompanies = useMemo(() => 
    Object.keys(jobsByCompany).filter(name => 
      !jobsByCompany[name].some(j => !isExpired(j))
    ).sort()
  , [jobsByCompany, isExpired]);

  const currentJobDetails = useMemo(() => selectedJob ? parseJobDetails(selectedJob) : null, [selectedJob]);

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
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', width: '100%', boxSizing: 'border-box', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '4rem', alignItems: 'start' }}>
            {/* Sidebar Metadata */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: `${headerHeight + 20}px` }}>
              {selectedJob.closing_date && (
                <div style={{ backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                  <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Apply By</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 900, color: '#b91c1c' }}>{formatDate(selectedJob.closing_date)}</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href={selectedJob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.75rem 0.5rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8125rem', textDecoration: 'none' }}
                >
                  <ExternalLink size={14} />
                  Apply
                </a>
                <button
                  onClick={(e) => toggleSaveJob(selectedJob, e)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', backgroundColor: 'white', color: selectedJob.is_saved ? '#0f172a' : '#64748b', border: '1px solid #e2e8f0', padding: '0.75rem 0.5rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer' }}
                >
                  <Bookmark size={14} fill={selectedJob.is_saved ? '#0f172a' : 'transparent'} />
                  {selectedJob.is_saved ? 'Saved' : 'Save'}
                </button>
              </div>

              <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { label: 'Department', val: selectedJob.department },
                  { label: 'Location', val: selectedJob.location },
                  { label: 'Salary', val: currentJobDetails?.salary },
                  { label: 'Work Mode', val: currentJobDetails?.mode },
                  { label: 'Employment', val: currentJobDetails?.type },
                  { label: 'Duration', val: currentJobDetails?.duration },
                  { label: 'Union', val: currentJobDetails?.union },
                  { label: 'Skills / Programs', val: currentJobDetails?.skills },
                  { label: 'Benefits', val: currentJobDetails?.benefits },
                  { label: 'Eligibility', val: currentJobDetails?.future, highlight: true }
                ].filter(i => i.val).map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.15rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: (item as {highlight?: boolean}).highlight ? '#9a3412' : '#1e293b', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      {item.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '0' }}>
                <div
                  onClick={() => handleNavigate('jobs', selectedJob.source)}
                  style={{ color: '#2563eb', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.5rem', cursor: 'pointer' }}
                >
                  {selectedJob.source}
                </div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 1.5rem 0', letterSpacing: '-0.04em', lineHeight: 1.1 }}>{selectedJob.job_title}</h1>

                {selectedJob.description ? (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                    <div
                      style={{ fontSize: '0.9rem', lineHeight: 1.7, color: '#334155' }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedJob.description) }}
                    />
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="animate-pulse" style={{ height: '1.25rem', backgroundColor: '#f1f5f9', borderRadius: '4px', width: '80%' }} />
                    <div className="animate-pulse" style={{ height: '1.25rem', backgroundColor: '#f1f5f9', borderRadius: '4px', width: '95%' }} />
                    <div className="animate-pulse" style={{ height: '1.25rem', backgroundColor: '#f1f5f9', borderRadius: '4px', width: '60%' }} />
                    <div className="animate-pulse" style={{ height: '1.25rem', backgroundColor: '#f1f5f9', borderRadius: '4px', width: '90%' }} />
                    <div className="animate-pulse" style={{ height: '1.25rem', backgroundColor: '#f1f5f9', borderRadius: '4px', width: '40%' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
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
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '4rem' }}>
              <aside style={{ display: 'flex', flexDirection: 'column', position: 'sticky', top: `${headerHeight + 20}px`, alignSelf: 'start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#0f172a' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters</span>
                </div>
                <FilterSection title="Salary Min">{[50000, 75000, 100000, 125000].map(val => (<FilterButton key={val} label={`$${val/1000}k+`} active={minSalary === val} onClick={() => setMinSalary(minSalary === val ? null : val)} />))}</FilterSection>
                <FilterSection title="Work Mode">{['In-person', 'Hybrid', 'Remote'].map(mode => (<FilterButton key={mode} label={mode} active={selectedModes.includes(mode)} onClick={() => setSelectedModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode])} />))}</FilterSection>
                <FilterSection title="Deadline"><FilterButton label="Closing soon" active={closingSoon} onClick={() => setClosingSoon(!closingSoon)} /></FilterSection>
                <FilterSection title="Job Type"><FilterButton label="Ongoing/Inventory" active={showInventories} onClick={() => setShowInventories(!showInventories)} /></FilterSection>
                <div style={{ marginTop: '1.5rem' }}><button onClick={() => {reset(); setShowInventories(false);}} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'transparent', color: '#64748b', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Reset filters</button></div>
              </aside>

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
                    <>
                      {activeCompanies.map(name => (
                        <div key={name} onClick={() => {setMinSalary(null); setSelectedModes([]); setClosingSoon(false); handleNavigate('jobs', name); }} style={{ padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 700 }}>{name}</span>
                          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 700 }}>{activeJobsByCompany[name].length} positions</span>
                        </div>
                      ))}
                      {inactiveCompanies.length > 0 && (
                        <>
                          <div style={{ marginTop: '1rem', marginBottom: '0.25rem', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Not currently hiring
                          </div>
                          {inactiveCompanies.map(name => (
                            <div key={name} onClick={() => {setMinSalary(null); setSelectedModes([]); setClosingSoon(false); handleNavigate('jobs', name); }} style={{ padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
                              <span style={{ fontSize: '1rem', fontWeight: 700 }}>{name}</span>
                              <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 700 }}>{jobsByCompany[name].length} positions (archived)</span>
                            </div>
                          ))}
                        </>
                      )}
                    </>
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
