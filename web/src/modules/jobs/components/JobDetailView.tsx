import { Bookmark, ExternalLink } from 'lucide-react';
import type { MouseEvent } from 'react';
import { formatDate, getQuickScanLabels, parseMarkdownSections, renderMarkdown } from '../../../utils';
import type { Job, JobDetails, View } from '../../../types/jobs';

export function JobDetailView({ job, details, headerHeight, onNavigate, onToggleSave }: {
  job: Job;
  details: JobDetails;
  headerHeight: number;
  onNavigate: (view: View, companyFilter?: string) => void;
  onToggleSave: (job: Job, event: MouseEvent) => void;
}) {
  const descriptionSections = parseMarkdownSections(job.description ?? null);
  const overview = descriptionSections.find(section => section.heading.toLowerCase() === 'overview');
  const detailSections = descriptionSections.filter(section => section !== overview && section.body);
  const metadata = [
    { label: 'Department', value: job.department }, { label: 'Location', value: job.location },
    { label: 'Salary', value: details.salary }, { label: 'Work Mode', value: details.mode },
    { label: 'Employment', value: details.type }, { label: 'Duration', value: details.duration },
    { label: 'Union', value: details.union }, { label: 'Skills / Programs', value: details.skills },
    { label: 'Benefits', value: details.benefits }, { label: 'Eligibility', value: details.future, highlight: true },
  ];

  return <main className="detail-main">
    <div className="detail-grid">
      <div className="detail-sidebar" style={{ top: `${headerHeight + 20}px` }}>
        {job.closing_date && <div className="deadline-card"><div className="deadline-label">Apply By</div><div className="deadline-value">{formatDate(job.closing_date)}</div></div>}
        <div className="detail-actions">
          <a className="detail-action apply-button" href={job.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Apply</a>
          <button className="detail-action save-button" onClick={event => onToggleSave(job, event)}><Bookmark size={14} fill={job.is_saved ? '#0f172a' : 'transparent'} />{job.is_saved ? 'Saved' : 'Save'}</button>
        </div>
        <div className="detail-metadata">{metadata.filter(item => item.value).map(item => <div key={item.label}><div className="metadata-label">{item.label}</div><div className={`metadata-value ${item.highlight ? 'highlight' : ''}`}>{item.value}</div></div>)}</div>
      </div>
      <div className="detail-content">
        <div className="detail-card">
          <div className="detail-source" onClick={() => onNavigate('jobs', job.source)}>{job.source}</div>
          <h1 className="detail-title">{job.job_title}</h1>
          {job.description ? <div className="detail-description">
            {overview && <div className="detail-overview" dangerouslySetInnerHTML={{ __html: renderMarkdown(`## ${overview.heading}\n${overview.body}`) }} />}
            {detailSections.map(section => {
              const labels = getQuickScanLabels(section.heading, section.body);
              const isLongSection = /responsibilit|qualif/i.test(section.heading);
              if (!isLongSection) {
                return <div key={section.heading} dangerouslySetInnerHTML={{ __html: renderMarkdown(`## ${section.heading}\n${section.body}`) }} />;
              }
              return <div className="detail-section-collapsible" key={section.heading}>
                <details>
                  <summary><span>{section.heading}</span><span className="detail-section-count">{section.body.split('\n').filter(line => /^\s*[-•]\s+/.test(line)).length || 'Details'}</span></summary>
                  <div className="detail-section-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(section.body) }} />
                </details>
                {labels.length > 0 && <div className="detail-quick-scan" aria-label={`${section.heading} quick scan`}>{labels.map(label => <span className="detail-quick-chip" key={label}>{label}</span>)}</div>}
              </div>;
            })}
          </div> : <div className="detail-loading">{[80, 95, 60, 90, 40].map(width => <div key={width} className="detail-loading-line animate-pulse" style={{ width: `${width}%` }} />)}</div>}
        </div>
      </div>
    </div>
  </main>;
}
