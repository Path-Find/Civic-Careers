import { Bookmark, ExternalLink } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { compactOverview, formatDate, getQuickScanLabels, isPlaceholderSection, isRedundantCompensation, parseMarkdownSections, reclassifyMandatoryNiceToHave, renderMarkdown } from '../../../utils';
import { parseTagList } from '../jobUtils';
import type { Job, JobDetails, View } from '../../../types/jobs';

const REPORT_REASONS = [
  'This is a student job',
  'This is a talent pool',
  'This is a recruitment program',
  'Issue with application link',
  'Issue with Job Description',
  'Issue with job details (location, salary, work mode, employment type, duration)',
  'Issue with requirements',
  'Issue with closing date',
  'Duplicate job',
] as const;

function ReportDialog({ job, onClose }: { job: Job; onClose: () => void }) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const toggleReason = (reason: string) => setSelectedReasons(previous => previous.includes(reason)
    ? previous.filter(value => value !== reason)
    : [...previous, reason]);
  const submit = () => {
    const reasons = selectedReasons.length > 0 ? selectedReasons : ['Other'];
    if (selectedReasons.length === 0 && !note.trim()) return;
    const body = [
      'Reported reasons:',
      ...reasons.map(reason => `- ${reason}`),
      note.trim() ? `\nAdditional details:\n${note.trim()}` : '',
      '',
      `Job title: ${job.job_title}`,
      `Company: ${job.source}`,
      `Internal row ID: ${job.rid}`,
      `Source job ID: ${job.id}`,
      `URL: ${job.url}`,
    ].filter(Boolean).join('\n');
    const reportUrl = `https://github.com/ryanphanna/Civic-Careers/issues/new?title=${encodeURIComponent(`Report job: ${job.job_title}`)}&labels=data-quality,frontend&body=${encodeURIComponent(body)}`;
    window.open(reportUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return <div className="report-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
      <div className="report-dialog-header">
        <h2 id="report-dialog-title">Report a problem</h2>
        <button type="button" className="report-dialog-close" onClick={onClose} aria-label="Close report dialog">×</button>
      </div>
      <p>Select all reasons that apply, or describe another problem below.</p>
      <div className="report-reasons">
        {REPORT_REASONS.map(reason => <label key={reason} className="report-reason">
          <input type="checkbox" checked={selectedReasons.includes(reason)} onChange={() => toggleReason(reason)} />
          <span>{reason}</span>
        </label>)}
      </div>
      <label className="report-note-label" htmlFor="report-note">Additional details (optional)</label>
      <textarea id="report-note" className="report-note" value={note} onChange={event => setNote(event.target.value)} rows={4} />
      <div className="report-dialog-actions">
        <button type="button" className="report-dialog-cancel" onClick={onClose}>Cancel</button>
        <button type="button" className="report-dialog-submit" onClick={submit} disabled={selectedReasons.length === 0 && !note.trim()}>Open GitHub report</button>
      </div>
    </div>
  </div>;
}

export function JobDetailView({ job, details, headerHeight, onNavigate, onToggleSave }: {
  job: Job;
  details: JobDetails;
  headerHeight: number;
  onNavigate: (view: View, companyFilter?: string) => void;
  onToggleSave: (job: Job, event: MouseEvent) => void;
}) {
  const API = import.meta.env.VITE_API_URL ?? '';
  const [showReportDialog, setShowReportDialog] = useState(false);
  const recordApplyClick = () => {
    void fetch(`${API}/api/jobs/${job.id}/apply-click`, { method: 'POST', keepalive: true }).catch(() => {});
  };
  const descriptionSections = reclassifyMandatoryNiceToHave(parseMarkdownSections(job.description ?? null));
  const overview = descriptionSections.find(section => section.heading.toLowerCase() === 'overview');
  const detailSections = descriptionSections.filter(section => section !== overview && section.body && !isPlaceholderSection(section.body) && !isRedundantCompensation(section.heading, section.body));
  const responsibilityTags = parseTagList(job.responsibility_tags);
  const qualificationTags = parseTagList(job.qualification_tags);
  const metadata = [
    { label: 'Department', value: job.department }, { label: 'Location', value: job.location },
    { label: 'Salary', value: details.salary }, { label: 'Work Mode', value: details.mode },
    { label: 'Employment', value: details.type }, { label: 'Duration', value: details.duration },
    { label: 'Listing type', value: details.listingType }, { label: 'Student requirement', value: details.studentRequirement },
    { label: 'Union', value: details.union }, { label: 'Education', value: details.education },
    { label: 'Licences', value: details.licenses }, { label: 'Languages', value: details.language },
    { label: 'Vehicle', value: details.vehicle }, { label: 'Certifications', value: details.certifications },
    { label: 'Software', value: details.software }, { label: 'Skills / Programs', value: details.skills },
    { label: 'Benefits', value: details.benefits }, { label: 'Eligibility', value: details.future, highlight: true },
  ];

  return <main className="detail-main">
    <div className="detail-grid">
      <div className="detail-sidebar" style={{ top: `${headerHeight + 20}px` }}>
        {job.closing_date && <div className="deadline-card"><div className="deadline-label">Apply By</div><div className="deadline-value">{formatDate(job.closing_date)}</div></div>}
        <div className="detail-actions">
          <a className="detail-action apply-button" href={job.url} target="_blank" rel="noopener noreferrer" onClick={recordApplyClick}><ExternalLink size={14} /> Apply</a>
          <button className="detail-action save-button" onClick={event => onToggleSave(job, event)}><Bookmark size={14} fill={job.is_saved ? '#0f172a' : 'transparent'} />{job.is_saved ? 'Saved' : 'Save'}</button>
        </div>
        <div className="detail-metadata">{metadata.filter(item => item.value).map(item => <div key={item.label}><div className="metadata-label">{item.label}</div><div className={`metadata-value ${item.highlight ? 'highlight' : ''}`}>{item.value}</div></div>)}</div>
        <button className="detail-action report-button" onClick={() => setShowReportDialog(true)}>Report a problem</button>
      </div>
      <div className="detail-content">
        <div className="detail-card">
          <div className="detail-source" onClick={() => onNavigate('jobs', job.source)}>{job.source}</div>
          <h1 className="detail-title" title={job.job_title || undefined}>{job.job_title}</h1>
          {job.description ? <div className="detail-description">
            {overview && <div className="detail-overview" dangerouslySetInnerHTML={{ __html: renderMarkdown(`## ${overview.heading}\n${compactOverview(overview.body)}`) }} />}
            {detailSections.map(section => {
              const isGroupedSection = /responsibilit|qualif/i.test(section.heading);
              const labels = isGroupedSection
                ? (/qualif/i.test(section.heading) && qualificationTags.length ? qualificationTags : /responsibilit/i.test(section.heading) && responsibilityTags.length ? responsibilityTags : getQuickScanLabels(section.heading, section.body))
                : [];
              const isLongSection = isGroupedSection || /nice to have/i.test(section.heading);
              if (!isLongSection) {
                return <div key={section.heading} dangerouslySetInnerHTML={{ __html: renderMarkdown(`## ${section.heading}\n${section.body}`) }} />;
              }
              return <details className="detail-section-collapsible" key={section.heading} open={/qualif|responsibilit/i.test(section.heading)}>
                <summary className="detail-section-summary">
                  <span className="detail-section-title">{section.heading}</span>
                  <span className="detail-section-action">View details</span>
                </summary>
                {labels.length > 0 && <div className="detail-quick-scan" aria-label={`${section.heading} summary`}>{labels.map(label => <span className="detail-quick-chip" key={label}>{label}</span>)}</div>}
                <div className="detail-full-section" dangerouslySetInnerHTML={{ __html: renderMarkdown(section.body) }} />
              </details>;
            })}
          </div> : <div className="detail-loading">{[80, 95, 60, 90, 40].map(width => <div key={width} className="detail-loading-line animate-pulse" style={{ width: `${width}%` }} />)}</div>}
        </div>
      </div>
    </div>
    {showReportDialog && <ReportDialog job={job} onClose={() => setShowReportDialog(false)} />}
  </main>;
}
