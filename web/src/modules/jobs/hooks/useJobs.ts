import { useCallback, useEffect, useState } from 'react';
import type { Job } from '../../../types/jobs';
import { normalizeJob } from '../jobUtils';

const API = import.meta.env.VITE_API_URL ?? '';

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback((singleRid?: number) => {
    setLoading(true);
    const endpoint = singleRid === undefined ? `${API}/api/jobs` : `${API}/api/jobs?rid=${singleRid}`;
    fetch(endpoint)
      .then(response => response.json())
      .then(data => setJobs((Array.isArray(data) ? data : [data]).map(normalizeJob)))
      .catch(error => console.error('Error fetching jobs:', error))
      .finally(() => setLoading(false));
  }, []);

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

  return { jobs, loading, refresh, updateJob, loadDescription, toggleSaved };
}
