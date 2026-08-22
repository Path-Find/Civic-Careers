import { Bookmark, ExternalLink } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { compactOverview, daysUntilClose, formatDate, getQuickScanLabels, isPlaceholderSection, isRedundantCompensation, parseMarkdownSections, reclassifyMandatoryNiceToHave, renderMarkdown } from '../../../utils';
import { parseTagList } from '../jobUtils';
import { CopyLinkButton } from './CopyLinkButton';
import { pendingDetailAction } from '../pendingDetailAction';
import type { Job, JobDetails, View } from '../../../types/jobs';

const REPORT_REASONS = [
  'Wrong title or parser output',
  'Wrong field or job details',
  'Wrong academic or student classification',
  'Wrong deadline or availability',
  'Wrong application link',
  'Duplicate or should be hidden',
  'Other',
] as const;

function ReportDialog({ job, details, onClose }: { job: Job; details: JobDetails; onClose: () => void }) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'opened' | 'blocked'>('idle');
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
      `Source: ${job.source}`,
      `Civic Careers job ID: ${job.id}`,
      `Public job page: ${window.location.href}`,
      `Apply URL: ${job.url}`,
      `Original posting URL: ${job.details_url ?? 'Not available'}`,
      '',
      'Current structured values:',
      `- Location: ${job.location ?? 'empty'}`,
      `- Salary: ${details.salary ?? 'empty'}`,
      `- Closing date: ${job.closing_date ?? (job.closing_date_status === 'open_until_filled' ? 'Until filled' : 'empty')}`,
      `- Student requirement: ${details.studentRequirement ?? 'empty'}`,
      `- Academic role: ${details.academicRole ?? 'empty'}`,
      `- Career stage: ${job.career_stage ?? 'empty'}`,
    ].filter(Boolean).join('\n');
    const reportUrl = `https://github.com/ryanphanna/Civic-Careers/issues/new?title=${encodeURIComponent(`Report job: ${job.source} — ${job.job_title}`)}&labels=data-quality,frontend,user-reported&body=${encodeURIComponent(body)}`;
    const reportWindow = window.open(reportUrl, '_blank', 'noopener,noreferrer');
    setReportStatus(reportWindow ? 'opened' : 'blocked');
  };

  return <div className="report-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
      <div className="report-dialog-header">
        <h2 id="report-dialog-title">Report a problem</h2>
        <button type="button" className="report-dialog-close" onClick={onClose} aria-label="Close report dialog">×</button>
      </div>
      <p>Select the quickest matching category. You can choose more than one, then add only the detail that needs fixing.</p>
      {reportStatus === 'opened' && <p className="report-dialog-status" role="status">GitHub opened in a new tab. Review the prefilled report and submit it there.</p>}
      {reportStatus === 'blocked' && <p className="report-dialog-status report-dialog-status-error" role="alert">GitHub could not open. Allow pop-ups for Civic Careers, then try again.</p>}
      <div className="report-reasons">
        {REPORT_REASONS.map(reason => <label key={reason} className="report-reason">
          <input type="checkbox" checked={selectedReasons.includes(reason)} onChange={() => toggleReason(reason)} />
          <span>{reason}</span>
        </label>)}
      </div>
      <label className="report-note-label" htmlFor="report-note">What should be fixed? (optional)</label>
      <textarea id="report-note" className="report-note" value={note} onChange={event => setNote(event.target.value)} placeholder="Example: the title contains the course term; move it to Academic term." rows={4} />
      <div className="report-dialog-actions">
        <button type="button" className="report-dialog-cancel" onClick={onClose}>Cancel</button>
        <button type="button" className="report-dialog-submit" onClick={submit} disabled={selectedReasons.length === 0 && !note.trim()}>Open GitHub report</button>
      </div>
    </div>
  </div>;
}

type DetailMetadata = { label: string; value: string | null; highlight?: boolean };

function MetadataValue({ item }: { item: DetailMetadata }) {
  return <div className={`metadata-value ${item.highlight ? 'highlight' : ''}`}>{item.value}</div>;
}

const HIDDEN_SOURCE_SECTION = /^(?:the opportunity|corporate culture|our culture and qualifications of the job|knowledge\/skill\/ability)$/i;

function isTitleLikeDepartment(title: string | null, department: string | null): boolean {
  if (!title || !department) return false;
  const words = (value: string) => value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const titleWords = new Set(words(title));
  const departmentWords = words(department).filter(word => !['a', 'and', 'of', 'or', 'the'].includes(word));
  return departmentWords.length > 1 && departmentWords.every(word => titleWords.has(word));
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
  const pendingAction = pendingDetailAction(job.details_url);
  const recordApplyClick = () => {
    void fetch(`${API}/api/jobs/${encodeURIComponent(job.id)}/apply-click`, { method: 'POST', keepalive: true }).catch(() => {});
  };
  const descriptionSections = reclassifyMandatoryNiceToHave(parseMarkdownSections(job.description ?? null));
  const overviewRaw = descriptionSections.find(section => section.heading.toLowerCase() === 'overview');
  // Skip empty / placeholder overviews — no heading with nothing under it.
  const overview = overviewRaw && overviewRaw.body.trim() && !isPlaceholderSection(overviewRaw.body)
    ? overviewRaw
    : undefined;
  const otherInformation = descriptionSections.find(section => /^other important information$/i.test(section.heading));
  const detailSections = descriptionSections.filter(section => section !== overviewRaw
    && section !== otherInformation
    && !HIDDEN_SOURCE_SECTION.test(section.heading)
    && !/^education\b/i.test(section.heading)
    && section.body
    && !isPlaceholderSection(section.body)
    && !isRedundantCompensation(section.heading, section.body));
  const responsibilityTags = parseTagList(job.responsibility_tags);
  const qualificationTags = parseTagList(job.qualification_tags);
  const metadata: DetailMetadata[] = [
    { label: 'Location', value: job.location },
    { label: 'Salary', value: details.salary }, { label: 'Work Mode', value: details.mode },
    { label: 'Employment', value: details.type }, { label: 'Term', value: details.duration },
    { label: 'Start date', value: details.startDate },
    { label: 'Hours', value: details.hours },
    { label: 'Listing type', value: details.listingType }, { label: 'Student requirement', value: details.studentRequirement },
    { label: 'Benefits', value: details.benefits }, { label: 'Union', value: details.union },
  ].filter(item => !(item.label === 'Term'
    && details.type
    && details.duration
    && details.type.trim().toLowerCase() === details.duration.trim().toLowerCase()));
  const visibleMetadata = metadata.filter(item => item.value);
  const requirementMetadata: DetailMetadata[] = [
    { label: 'Experience', value: details.experience },
    { label: 'Education', value: details.education },
    { label: 'Availability', value: details.availability },
    { label: 'Licences', value: details.licenses }, { label: 'Languages', value: details.language },
    { label: 'Vehicle', value: details.vehicle }, { label: 'Security check', value: details.securityCheck },
    { label: 'Certifications', value: details.certifications },
    { label: 'Medical', value: details.medical },
    { label: 'Software', value: details.software }, { label: 'Skills / Programs', value: details.skills },
    { label: 'Eligibility', value: details.future, highlight: true },
  ].filter(item => item.value);
  const hasRequirementsCard = requirementMetadata.length > 0 || Boolean(otherInformation);
  const academicMetadata: DetailMetadata[] = [
    { label: 'Term', value: details.academicTerm },
    { label: 'Course / project', value: details.academicCourse },
    { label: 'Workload', value: details.academicWorkload },
    { label: 'Office hours', value: details.academicOfficeHours },
    { label: 'Schedule', value: details.academicSchedule },
    { label: 'Appointment type', value: details.academicAppointmentType },
    { label: 'Supervisor', value: details.academicSupervisor },
  ].filter(item => item.value);
  const closingDays = daysUntilClose(job.closing_date);
  const urgentDeadline = closingDays !== null && closingDays >= 0 && closingDays <= 3;

  return <main className="detail-main">
    <div className="detail-grid">
      <div className="detail-sidebar" style={{ top: `${headerHeight + 20}px` }}>
        {job.closing_date && formatDate(job.closing_date) && <div className={`deadline-card ${urgentDeadline ? 'deadline-card-urgent' : ''}`}><div className="deadline-label">Apply By</div><div className="deadline-value">{formatDate(job.closing_date)}</div></div>}
        {!job.closing_date && job.closing_date_status === 'open_until_filled' && <div className="deadline-card deadline-card-until-filled"><div className="deadline-label">Apply By</div><div className="deadline-value">Until filled</div></div>}
        <div className="detail-actions">
          <a className="detail-action apply-button" href={job.url} target="_blank" rel="noopener noreferrer" onClick={recordApplyClick}><ExternalLink size={14} /> Apply</a>
          <button className="detail-action save-button" onClick={event => onToggleSave(job, event)}><Bookmark size={14} fill={job.is_saved ? '#0f172a' : 'transparent'} />{job.is_saved ? 'Saved' : 'Save'}</button>
        </div>
        <CopyLinkButton label="Copy job link" />
        {visibleMetadata.length > 0 && <div className="detail-metadata">{visibleMetadata.map(item => <div key={item.label}><div className="metadata-label">{item.label}</div><MetadataValue item={item} /></div>)}</div>}
        <button className="detail-action report-button" onClick={() => setShowReportDialog(true)}>Report a problem</button>
      </div>
      <div className="detail-content">
        <div className="detail-card">
          <div className="detail-source-row">
            <span className="detail-source" onClick={() => onNavigate('jobs', job.source)}>{job.source}</span>
            {job.department && job.department !== job.source && !isTitleLikeDepartment(job.job_title, job.department) && <span className="detail-department"> · {job.department}</span>}
          </div>
          <h1 className="detail-title" title={job.job_title || undefined}>{job.job_title}</h1>
          {(details.academicRole || academicMetadata.length > 0) && <section className="detail-academic-card" aria-labelledby="academic-heading">
            <div className="detail-academic-header">
              <h2 id="academic-heading" className="detail-academic-heading">Academic context</h2>
              {details.academicRole && <span className="detail-academic-role">{details.academicRole}</span>}
            </div>
            {academicMetadata.length > 0 && <div className="detail-academic-grid">
              {academicMetadata.map(item => <div key={item.label} className="detail-requirement-item">
                <div className="metadata-label">{item.label}</div>
                <MetadataValue item={item} />
              </div>)}
            </div>}
          </section>}
          {hasRequirementsCard && <section className="detail-requirements-card" aria-labelledby="requirements-heading">
            <h2 id="requirements-heading" className="detail-requirements-heading">Job requirements & details</h2>
            {requirementMetadata.length > 0 && <div className="detail-requirements-grid">
              {requirementMetadata.map(item => <div key={item.label} className="detail-requirement-item">
                <div className="metadata-label">{item.label}</div>
                <MetadataValue item={item} />
              </div>)}
            </div>}
            {otherInformation && <div className="detail-other-information">
              <h3 className="detail-other-information-heading">Other important information</h3>
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(otherInformation.body) }} />
            </div>}
          </section>}
          {job.details_pending === 1 ? <section className="detail-pending" role="status" aria-labelledby="details-pending-heading">
            <h2 id="details-pending-heading">Details pending</h2>
            <p>The job was found, but its details are still being prepared.</p>
            {pendingAction && <a className="detail-pending-link" href={pendingAction.href} target="_blank" rel="noopener noreferrer">
              {pendingAction.label} <ExternalLink size={14} />
            </a>}
          </section> : job.description ? <div className="detail-description">
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
              return <section className="detail-section" key={section.heading}>
                <div className="detail-section-heading">
                  <span className="detail-section-title">{section.heading}</span>
                </div>
                {labels.length > 0 && <div className="detail-quick-scan" aria-label={`${section.heading} summary`}>{labels.map(label => <span className="detail-quick-chip" key={label}>{label}</span>)}</div>}
                <div className="detail-full-section" dangerouslySetInnerHTML={{ __html: renderMarkdown(section.body) }} />
              </section>;
            })}
          </div> : <div className="detail-loading">{[80, 95, 60, 90, 40].map(width => <div key={width} className="detail-loading-line animate-pulse" style={{ width: `${width}%` }} />)}</div>}
        </div>
      </div>
    </div>
    {showReportDialog && <ReportDialog job={job} details={details} onClose={() => setShowReportDialog(false)} />}
  </main>;
}
