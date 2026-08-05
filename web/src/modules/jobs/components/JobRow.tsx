import { ChevronRight } from 'lucide-react';
import type { MouseEvent } from 'react';
import { daysUntilClose, formatDate, jobRoute } from '../../../utils';
import type { Job } from '../../../types/jobs';

export function JobRow({ job, onClick }: { job: Job; onClick: () => void }) {
  const days = daysUntilClose(job.closing_date);
  const urgent = days !== null && days >= 0 && days <= 7;
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
        {job.listing_type === 'ongoing_recruitment' && <span className="job-badge job-badge-ongoing">Ongoing recruitment</span>}
        {(job.listing_type === 'inventory' || job.is_inventory === 1) && <span className="job-badge job-badge-inventory">Candidate inventory</span>}
        {job.is_student === 1 && <span className="job-badge job-badge-student">Student/Co-op</span>}
      </div>
      <div className="job-row-meta">
        <span className="job-row-source">{job.source}</span>
        {job.department && <span>• {job.department}</span>}
      </div>
    </div>
    <div className="job-row-actions">
      {job.closing_date && <div className="job-row-deadline" style={{ color: urgent ? '#dc2626' : '#94a3b8' }}>
        {urgent ? (days === 0 ? 'Closes today' : days === 1 ? '1 day left' : `${days}d left`) : formatDate(job.closing_date)}
      </div>}
      <ChevronRight size={16} className="job-row-chevron" />
    </div>
  </>;

  if (!job.is_active) return <div className="job-row" style={{ cursor: 'default', opacity: 0.6 }}>{content}</div>;
  return <a className="job-row" href={jobRoute(job.id)} onClick={handleClick} style={{ cursor: 'pointer' }}>{content}</a>;
}
