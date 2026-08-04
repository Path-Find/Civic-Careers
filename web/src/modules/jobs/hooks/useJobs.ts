import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompanySummary, HomeData, Job } from '../../../types/jobs';
import { normalizeJob } from '../jobUtils';

const API = import.meta.env.VITE_API_URL ?? '';
const pendingRequests = new Map<string, Promise<unknown>>();

function fetchJson(endpoint: string) {
  const pending = pendingRequests.get(endpoint);
  if (pending) return pending;

  const request = fetch(endpoint)
    .then(response => response.json())
    .finally(() => pendingRequests.delete(endpoint));
  pendingRequests.set(endpoint, request);
  return request;
}

function companySlugFromPath(path: string): string | null {
  if (!path.startsWith('/companies/')) return null;
  const slug = path.slice('/companies/'.length).split('/')[0];
  return slug || null;
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [companySummaries, setCompanySummaries] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsAvailableTotal, setJobsAvailableTotal] = useState(0);
  /** Exact source name when the jobs list is scoped to one employer (company page). */
  const [jobsSource, setJobsSource] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);
  const jobsSourceRef = useRef<string | null>(null);

  const clearSourceScope = () => {
    setJobsSource(null);
    jobsSourceRef.current = null;
  };

  const setSourceScope = (source: string | null) => {
    setJobsSource(source);
    jobsSourceRef.current = source;
  };

  const refresh = useCallback((singleRid?: number) => {
    setLoading(true);
    const path = window.location.pathname;
    const companySlug = companySlugFromPath(path);
    const view = path === '/' || path === '/about'
      ? 'home'
      : path === '/companies'
        ? 'companies'
        : path === '/jobs' || companySlug
          ? 'jobs'
          : path === '/saved'
            ? 'saved'
            : null;

    let endpoint: string;
    if (singleRid !== undefined) {
      endpoint = `${API}/api/jobs?rid=${singleRid}`;
    } else if (companySlug) {
      // Company deep link: only that employer's jobs (not the full corpus).
      endpoint = `${API}/api/jobs?view=jobs&sourceSlug=${encodeURIComponent(companySlug)}&limit=50`;
    } else if (view === 'jobs') {
      endpoint = `${API}/api/jobs?view=jobs&limit=50`;
    } else if (view) {
      endpoint = `${API}/api/jobs?view=${view}`;
    } else {
      endpoint = `${API}/api/jobs?view=jobs&limit=50`;
    }

    fetchJson(endpoint)
      .then(data => {
        if (view === 'home') {
          const recentJobs = data.recentJobs.map(normalizeJob);
          const closingSoonJobs = data.closingSoonJobs.map(normalizeJob);
          setHomeData({ ...data, recentJobs, closingSoonJobs });
          setJobs([...recentJobs, ...closingSoonJobs]);
          clearSourceScope();
          return;
        }

        if (view === 'companies') {
          setCompanySummaries(data);
          setJobs([]);
          clearSourceScope();
          return;
        }

        if (view === 'saved') {
          setJobs((Array.isArray(data) ? data : []).map(normalizeJob));
          clearSourceScope();
          return;
        }

        // Paginated jobs list (all employers or one company via sourceSlug)
        const list = Array.isArray(data.jobs) ? data.jobs.map(normalizeJob) : [];
        setJobs(list);
        setJobsTotal(Number(data.total ?? list.length));
        setJobsAvailableTotal(Number(data.availableTotal ?? data.total ?? list.length));
        setSourceScope(data.source ?? null);
      })
      .catch(error => console.error('Error fetching jobs:', error))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || jobs.length >= jobsTotal) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const source = jobsSourceRef.current;
      const params = new URLSearchParams({
        view: 'jobs',
        limit: '50',
        offset: String(jobs.length),
      });
      if (source) params.set('source', source);
      const response = await fetch(`${API}/api/jobs?${params}`);
      const data = await response.json();
      setJobs(previous => [...previous, ...(data.jobs ?? []).map(normalizeJob)]);
    } catch (error) {
      console.error('Error loading more jobs:', error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [jobs.length, jobsTotal]);

  useEffect(() => {
    const match = window.location.pathname.match(/^\/job\/(\d+)$/);
    void Promise.resolve().then(() => refresh(match ? Number(match[1]) : undefined));
  }, [refresh]);

  const updateJob = useCallback((id: string, changes: Partial<Job>) => {
    setJobs(previous => previous.map(job => job.id === id ? { ...job, ...changes } : job));
  }, []);

  const loadDescription = useCallback(async (job: Job) => {
    if (job.description) return;
    try {
      const response = await fetch(`${API}/api/jobs?id=${job.id}`);
      const data = await response.json();
      if (data.description) updateJob(job.id, { description: data.description });
      return data.description as string | undefined;
    } catch (error) {
      console.error('Error fetching job description:', error);
      return undefined;
    }
  }, [updateJob]);

  const toggleSaved = useCallback(async (job: Job) => {
    const response = await fetch(`${API}/api/jobs/${job.id}/toggle-save`, { method: 'POST' });
    if (!response.ok) return null;
    const { is_saved } = await response.json();
    updateJob(job.id, { is_saved });
    return is_saved as number;
  }, [updateJob]);

  return {
    jobs,
    homeData,
    companySummaries,
    loading,
    loadingMore,
    jobsTotal,
    jobsAvailableTotal,
    jobsSource,
    loadMore,
    refresh,
    updateJob,
    loadDescription,
    toggleSaved,
  };
}
