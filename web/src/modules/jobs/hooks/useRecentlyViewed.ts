import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Job } from '../../../types/jobs';

const STORAGE_KEY = 'civic-careers-recently-viewed';
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const recordViewed = useCallback((job: Job) => {
    setEntries(previous => [
      { id: job.id, viewedAt: Date.now() },
      ...previous.filter(entry => entry.id !== job.id),
    ].slice(0, MAX_ITEMS));
  }, []);

  const recentlyViewedJobs = useMemo(() => {
    const jobsById = new Map(jobs.map(job => [job.id, job]));
    return entries
      .map(entry => jobsById.get(entry.id))
      .filter((job): job is Job => Boolean(job));
  }, [entries, jobs]);

  return { recentlyViewedJobs, recordViewed };
}
