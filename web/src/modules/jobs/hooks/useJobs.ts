import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompanySummary, HomeData, Job, OrganizationGroup } from '../../../types/jobs';
import { normalizeJob } from '../jobUtils';
import { jobIdFromPath } from '../../../utils';

const API = import.meta.env.VITE_API_URL ?? '';
const pendingRequests = new Map<string, Promise<unknown>>();

export type JobsListServerFilters = {
  deadlineDays: number | null;
  newlyAdded: boolean;
  sourceNames: string[];
  locations: string[];
  educationLevels: string[];
  educationField: string;
  careerStages: string[];
};

const EMPTY_SERVER_FILTERS: JobsListServerFilters = {
  deadlineDays: null,
  newlyAdded: false,
  sourceNames: [],
  locations: [],
  educationLevels: [],
  educationField: '',
  careerStages: [],
};

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

function appendServerFilters(params: URLSearchParams, filters: JobsListServerFilters) {
  if (filters.deadlineDays !== null) {
    params.set('deadlineDays', String(filters.deadlineDays));
  }
  if (filters.newlyAdded) {
    params.set('newlyAdded', '1');
  }
  if (filters.sourceNames.length > 0) {
    params.set('sources', filters.sourceNames.join(','));
  }
  filters.locations.forEach(location => params.append('locations', location));
  if (filters.educationLevels.length > 0) {
    params.set('educationLevels', filters.educationLevels.join(','));
  }
  if (filters.educationField.trim()) {
    params.set('educationField', filters.educationField.trim());
  }
  if (filters.careerStages.length > 0) {
    params.set('careerStages', filters.careerStages.join(','));
  }
  if (filters.sourceNames.length > 0 || filters.locations.length > 0 || filters.educationLevels.length > 0 || filters.educationField.trim() || filters.careerStages.length > 0) {
    params.set('filtersVersion', '2');
  }
}

function savedNearCity(): string | null {
  try {
    const city = window.localStorage.getItem('civic-careers-near-city')?.trim();
    return city || null;
  } catch {
    return null;
  }
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [companySummaries, setCompanySummaries] = useState<CompanySummary[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [educationRequirements, setEducationRequirements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsAvailableTotal, setJobsAvailableTotal] = useState(0);
  /** Canonical employer name when the jobs list is scoped to one employer. */
  const [jobsSource, setJobsSource] = useState<string | null>(null);
  const [jobsOrganization, setJobsOrganization] = useState<OrganizationGroup | null>(null);
  const loadingMoreRef = useRef(false);
  const refreshRequestRef = useRef(0);
  const jobsSourcesRef = useRef<string[]>([]);
  /** Read by refresh/loadMore — update via setServerFilters before calling refresh. */
  const serverFiltersRef = useRef<JobsListServerFilters>(EMPTY_SERVER_FILTERS);

  const clearSourceScope = () => {
    setJobsSource(null);
    setJobsOrganization(null);
    jobsSourcesRef.current = [];
  };

  const setSourceScope = (source: string | null, sources: string[], organization: OrganizationGroup | null) => {
    setJobsSource(source);
    setJobsOrganization(organization);
    jobsSourcesRef.current = sources;
  };

  /** Sync server-backed list filters. Call before refresh(). */
  const setServerFilters = useCallback((next: JobsListServerFilters) => {
    serverFiltersRef.current = next;
  }, []);

  const refresh = useCallback((singleJobId?: string) => {
    const requestId = ++refreshRequestRef.current;
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
    if (singleJobId !== undefined) {
      endpoint = `${API}/api/jobs?jobId=${encodeURIComponent(singleJobId)}`;
    } else if (companySlug) {
      // Company deep link: only that employer's jobs (not the full corpus).
      const params = new URLSearchParams({
        view: 'jobs',
        sourceSlug: companySlug,
        limit: '50',
      });
      appendServerFilters(params, serverFiltersRef.current);
      endpoint = `${API}/api/jobs?${params}`;
    } else if (view === 'jobs') {
      const params = new URLSearchParams({ view: 'jobs', limit: '50' });
      appendServerFilters(params, serverFiltersRef.current);
      endpoint = `${API}/api/jobs?${params}`;
    } else if (view) {
      const params = new URLSearchParams({ view });
      if (view === 'home') {
        const city = savedNearCity();
        if (city) params.set('location', city);
      }
      endpoint = `${API}/api/jobs?${params}`;
    } else {
      const params = new URLSearchParams({ view: 'jobs', limit: '50' });
      appendServerFilters(params, serverFiltersRef.current);
      endpoint = `${API}/api/jobs?${params}`;
    }

    const companiesRequest = (view === 'jobs' || view === 'saved') && !companySlug
      ? fetchJson(`${API}/api/jobs?view=companies`)
      : Promise.resolve(null);
    const locationsRequest = view === 'jobs'
      ? fetchJson(`${API}/api/jobs?view=locations`)
      : Promise.resolve(null);
    const educationRequirementsRequest = view === 'jobs'
      ? fetchJson(`${API}/api/jobs?view=education-fields`)
      : Promise.resolve(null);
    Promise.all([fetchJson(endpoint), companiesRequest, locationsRequest, educationRequirementsRequest])
      .then(([data, companies, locationData, educationData]) => {
        if (requestId !== refreshRequestRef.current) return;
        if (companies) setCompanySummaries(Array.isArray(companies) ? companies : []);
        if (locationData) setLocations(Array.isArray(locationData) ? locationData : []);
        if (educationData) setEducationRequirements(Array.isArray(educationData) ? educationData : []);
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

        if (singleJobId !== undefined) {
          const job = data && !Array.isArray(data) && data.id != null
            ? normalizeJob(data)
            : null;
          setJobs(job ? [job] : []);
          setJobsTotal(job ? 1 : 0);
          setJobsAvailableTotal(job?.is_active ? 1 : 0);
          clearSourceScope();
          return;
        }

        // Paginated jobs list (all employers or one company via sourceSlug)
        const list = Array.isArray(data.jobs) ? data.jobs.map(normalizeJob) : [];
        setJobs(list);
        setJobsTotal(Number(data.total ?? list.length));
        setJobsAvailableTotal(Number(data.availableTotal ?? data.total ?? list.length));
        setSourceScope(data.source ?? null, Array.isArray(data.sources) ? data.sources : [], data.organization ?? null);
      })
      .catch(error => console.error('Error fetching jobs:', error))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || jobs.length >= jobsTotal) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const sources = jobsSourcesRef.current;
      const params = new URLSearchParams({
        view: 'jobs',
        limit: '50',
        offset: String(jobs.length),
      });
      if (sources.length > 0) params.set('sources', sources.join(','));
      appendServerFilters(params, serverFiltersRef.current);
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
    const jobId = jobIdFromPath(window.location.pathname);
    void Promise.resolve().then(() => refresh(jobId ?? undefined));
  }, [refresh]);

  const updateJob = useCallback((id: string, changes: Partial<Job>) => {
    setJobs(previous => previous.map(job => job.id === id ? { ...job, ...changes } : job));
  }, []);

  const loadDescription = useCallback(async (job: Job) => {
    try {
      const response = await fetch(`${API}/api/jobs?id=${job.id}`);
      const data = await response.json();
      if (data.description || data.academic_course || data.academic_schedule || data.details_pending !== undefined) {
        updateJob(job.id, {
          ...(data.description ? { description: data.description } : {}),
          ...(data.academic_course ? { academic_course: data.academic_course } : {}),
          ...(data.academic_schedule ? { academic_schedule: data.academic_schedule } : {}),
          ...(data.details_pending !== undefined ? { details_pending: Number(data.details_pending) } : {}),
        });
      }
      return {
        description: data.description as string | undefined,
        detailsPending: data.details_pending === undefined ? undefined : Number(data.details_pending),
      };
    } catch (error) {
      console.error('Error fetching job description:', error);
      return undefined;
    }
  }, [updateJob]);

  const toggleSaved = useCallback(async (job: Job) => {
    const response = await fetch(`${API}/api/jobs/${encodeURIComponent(job.id)}/toggle-save`, { method: 'POST' });
    if (!response.ok) return null;
    const { is_saved } = await response.json();
    updateJob(job.id, { is_saved });
    return is_saved as number;
  }, [updateJob]);

  return {
    jobs,
    locations,
    educationRequirements,
    homeData,
    companySummaries,
    loading,
    loadingMore,
    jobsTotal,
    jobsAvailableTotal,
    jobsSource,
    jobsOrganization,
    setServerFilters,
    loadMore,
    refresh,
    updateJob,
    loadDescription,
    toggleSaved,
  };
}
