export type AcademicRoleType =
  | 'faculty'
  | 'teaching_assistant'
  | 'research_assistant'
  | 'postdoctoral'
  | 'academic_instructor'
  | 'course_staff';

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
  hours: string | null;
  availability: string | null;
  academic_role_type: AcademicRoleType | null;
  academic_course: string | null;
  academic_workload: string | null;
  academic_office_hours: string | null;
  academic_supervisor: string | null;
  academic_appointment_type: string | null;
  is_unionized: number | null;
  union_name: string | null;
  benefits: string | null;
  required_skills: string | null;
  experience_requirements: string | null;
  education_requirements: string | null;
  license_requirements: string | null;
  vehicle_required: number | null;
  language_requirements: string | null;
  security_check_required: number | null;
  certification_requirements: string | null;
  software_requirements: string | null;
  medical_requirements: string | null;
  responsibility_tags: string | null;
  qualification_tags: string | null;
  details_url: string | null;
  description?: string | null;
  closing_date: string | null;
  posted_at: string | null;
  /** ISO date (YYYY-MM-DD) or short free text (Immediate, Fall 2026, October 2026). */
  start_date: string | null;
  url: string;
  source: string;
  first_seen_at: string;
  scraped_at: string;
  last_checked_at: string | null;
  is_saved: number;
  is_active: number;
  is_inventory: number;
  listing_type: 'regular' | 'ongoing_recruitment' | 'inventory' | null;
  is_student: number;
  details_pending: number;
  rid: number;
}

export interface HomeData {
  recentJobs: Job[];
  closingSoonJobs: Job[];
  availableJobCount: number;
  recentlyAddedCount: number;
  closingSoonCount: number;
  lastCheckedAt: string | null;
}

export interface CompanySummary {
  name: string;
  active_job_count: number;
  total_job_count: number;
  recent_job_count: number;
  latest_job_added_at: string | null;
  last_checked_at: string | null;
}

export type View = 'home' | 'jobs' | 'saved' | 'companies' | 'about';
export type ListingTypeFilter = 'ongoing_recruitment' | 'inventory' | null;

export interface JobDetails {
  salary: string | null;
  mode: string | null;
  type: string | null;
  duration: string | null;
  startDate: string | null;
  hours: string | null;
  availability: string | null;
  union: string | null;
  listingType: string | null;
  studentRequirement: string | null;
  education: string | null;
  experience: string | null;
  licenses: string | null;
  language: string | null;
  vehicle: string | null;
  securityCheck: string | null;
  certifications: string | null;
  software: string | null;
  medical: string | null;
  benefits: string | null;
  skills: string | null;
  future: string | null;
  academicRole: string | null;
  academicCourse: string | null;
  academicWorkload: string | null;
  academicOfficeHours: string | null;
  academicSupervisor: string | null;
  academicAppointmentType: string | null;
}

export interface JobFilters {
  minSalary: number | null;
  selectedModes: string[];
  closingSoon: boolean;
  showInventories: boolean;
  sortNewest: boolean;
}
