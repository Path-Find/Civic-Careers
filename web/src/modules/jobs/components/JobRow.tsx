import { ChevronRight } from 'lucide-react';
import type { MouseEvent } from 'react';
import { daysUntilClose, formatDate, jobRoute } from '../../../utils';
import type { Job } from '../../../types/jobs';
import { careerStageLabel } from '../careerStage';

export function JobRow({ job, onClick }: { job: Job; onClick: () => void }) {
  const days = daysUntilClose(job.closing_date);
  const urgent = days !== null && days >= 0 && days <= 7;
  const formattedDeadline = formatDate(job.closing_date);
  const deadlineText = formattedDeadline || (job.closing_date_status === 'open_until_filled' ? 'Until filled' : '');
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onClick();
  };

  const content = <>
    <div className="job-row-content">
      <div className="job-row-title">
        <span className="job-row-title-text" title={job.job_title || undefined}>{job.job_title}</span>
        {!job.is_active && <span className="job-badge job-badge-expired">Expired</span>}
        {job.listing_type === 'ongoing_recruitment' && <span className="job-badge job-badge-status" data-status="ongoing-recruitment">Ongoing recruitment</span>}
        {(job.listing_type === 'inventory' || job.is_inventory === 1) && <span className="job-badge job-badge-status" data-status="candidate-inventory">Candidate inventory</span>}
        {job.is_student === 1 && <span className="job-badge job-badge-student">Student/Co-op</span>}
        {job.career_stage && <span className="job-badge job-badge-status" data-status="career-stage">{careerStageLabel(job.career_stage)}</span>}
        {job.academic_term && <span className="job-badge job-badge-status" data-status="academic-term">{job.academic_term}</span>}
      </div>
      <div className="job-row-meta">
        <span className="job-row-source">{job.source}</span>
        {job.department && <span>• {job.department}</span>}
      </div>
    </div>
    <div className="job-row-actions">
      {deadlineText && <div className="job-row-deadline" style={{ color: urgent ? '#dc2626' : '#94a3b8' }}>
        {urgent ? (days === 0 ? 'Closes today' : days === 1 ? '1 day left' : `${days}d left`) : deadlineText}
      </div>}
      <ChevronRight size={16} className="job-row-chevron" />
    </div>
  </>;

  if (!job.is_active) return <div className="job-row" style={{ cursor: 'default', opacity: 0.6 }}>{content}</div>;
  return <a className="job-row" href={jobRoute(String(job.rid))} onClick={handleClick} style={{ cursor: 'pointer' }}>{content}</a>;
}
