import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Job } from '../../../types/jobs';
import { normalizeJob } from '../jobUtils';

const STORAGE_KEY = 'civic-careers-recently-viewed';
const API = import.meta.env.VITE_API_URL ?? '';
const MAX_ITEMS = 20;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface ViewedEntry {
  id: string;
  viewedAt: number;
}

function readEntries(): ViewedEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - MAX_AGE_MS;
    return parsed
      .filter((entry): entry is ViewedEntry =>
        typeof entry === 'object' && entry !== null
        && typeof entry.id === 'string'
        && typeof entry.viewedAt === 'number'
        && entry.viewedAt >= cutoff
      )
      .sort((a, b) => b.viewedAt - a.viewedAt)
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function useRecentlyViewed(jobs: Job[]) {
  const [entries, setEntries] = useState<ViewedEntry[]>(readEntries);
  const [fetchedJobs, setFetchedJobs] = useState<Job[]>([]);
  const requestedIds = useRef(new Set<string>());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const recordViewed = useCallback((job: Job) => {
    setEntries(previous => [
      { id: job.id, viewedAt: Date.now() },
      ...previous.filter(entry => entry.id !== job.id),
    ].slice(0, MAX_ITEMS));
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setEntries([]);
  }, []);

  const loadedIds = useMemo(() => new Set([...jobs, ...fetchedJobs].map(job => job.id)), [jobs, fetchedJobs]);

  useEffect(() => {
    const missingIds = entries
      .map(entry => entry.id)
      .filter(id => !loadedIds.has(id) && !requestedIds.current.has(id));
    if (missingIds.length === 0) return;
    missingIds.forEach(id => requestedIds.current.add(id));
    let cancelled = false;
    fetch(`${API}/api/jobs?ids=${missingIds.map(encodeURIComponent).join(',')}`)
      .then(response => response.ok ? response.json() : [])
      .then(data => {
        if (cancelled || !Array.isArray(data)) return;
        setFetchedJobs(previous => {
          const byId = new Map(previous.map(job => [job.id, job]));
          for (const rawJob of data) {
            const job = normalizeJob(rawJob);
            byId.set(job.id, job);
          }
          return [...byId.values()];
        });
      })
      .catch(error => console.error('Error fetching recently viewed jobs:', error));
    return () => { cancelled = true; };
  }, [entries, loadedIds]);

  const recentlyViewedJobs = useMemo(() => {
    const jobsById = new Map([...fetchedJobs, ...jobs].map(job => [job.id, job]));
    return entries
      .map(entry => jobsById.get(entry.id))
      .filter((job): job is Job => Boolean(job));
  }, [entries, fetchedJobs, jobs]);

  return { recentlyViewedJobs, recordViewed, clearRecentlyViewed };
}
