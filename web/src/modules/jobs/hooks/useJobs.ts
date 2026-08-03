import { useCallback, useEffect, useState } from 'react';
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

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [companySummaries, setCompanySummaries] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [jobsTotal, setJobsTotal] = useState(0);

  const refresh = useCallback((singleRid?: number) => {
    setLoading(true);
    const path = window.location.pathname;
    const view = path === '/' || path === '/about' ? 'home' : path === '/companies' ? 'companies' : path === '/jobs' ? 'jobs' : path === '/saved' ? 'saved' : null;
    const endpoint = singleRid !== undefined
      ? `${API}/api/jobs?rid=${singleRid}`
      : view ? `${API}/api/jobs?view=${view}` : `${API}/api/jobs`;
    fetchJson(endpoint)
      .then(data => {
        if (view === 'home') {
          const recentJobs = data.recentJobs.map(normalizeJob);
          const closingSoonJobs = data.closingSoonJobs.map(normalizeJob);
          setHomeData({ ...data, recentJobs, closingSoonJobs });
          setJobs([...recentJobs, ...closingSoonJobs]);
        } else if (view === 'companies') {
          setCompanySummaries(data);
          setJobs([]);
        } else if (view === 'jobs') {
          const loadedJobs = data.jobs.map(normalizeJob);
          setJobs(loadedJobs);
          setJobsTotal(Number(data.total ?? loadedJobs.length));
        } else {
          setJobs((Array.isArray(data) ? data : [data]).map(normalizeJob));
        }
      })
      .catch(error => console.error('Error fetching jobs:', error))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || jobs.length >= jobsTotal) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`${API}/api/jobs?view=jobs&limit=50&offset=${jobs.length}`);
      const data = await response.json();
      setJobs(previous => [...previous, ...data.jobs.map(normalizeJob)]);
    } catch (error) {
      console.error('Error loading more jobs:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [jobs.length, jobsTotal, loadingMore]);

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

  return { jobs, homeData, companySummaries, loading, loadingMore, jobsTotal, loadMore, refresh, updateJob, loadDescription, toggleSaved };
}
