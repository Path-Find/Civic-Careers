export interface Job {
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
  first_seen_at: string;
  scraped_at: string;
  is_saved: number;
  is_active: number;
  is_inventory: number;
  is_student: number;
  rid: number;
}

export type View = 'home' | 'jobs' | 'saved' | 'companies';

export interface JobDetails {
  salary: string | null;
  mode: string | null;
  type: string | null;
  duration: string | null;
  union: string | null;
  benefits: string | null;
  skills: string | null;
  future: string | null;
}

export interface JobFilters {
  minSalary: number | null;
  selectedModes: string[];
  closingSoon: boolean;
  showInventories: boolean;
  sortNewest: boolean;
}
