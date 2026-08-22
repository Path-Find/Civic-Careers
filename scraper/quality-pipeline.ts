/**
 * Shared quality and publication decision used by parser, soft-parser,
 * backfills, and publication repair. A row must pass this evaluator before
 * it can be public; callers should not invent a separate publication rule.
 */
import { classifyRawCapture } from './capture-quality';
import { getPublishBlockReason, type PublishGateDetails } from './publish-gate';
import { extractRawJobTitle, extractUrlJobTitle, isUsableJobTitle, normalizeSourceJobTitle } from './title';

export type PublicationStatus = 'hidden' | 'soft_parsed' | 'fully_parsed';

export interface QualityInput extends Omit<PublishGateDetails, 'title'> {
  source: string;
  title?: string | null;
  detailTitle?: string | null;
  rawText?: string | null;
  url?: string | null;
  applicationUrl?: string | null;
  closingDate?: string | null;
  closingDateStatus?: string | null;
  hasDetails?: boolean;
  parsedAt?: string | null;
}

export interface QualityEvaluation {
  title: string;
  status: PublicationStatus;
  blockReason: string | null;
  deadlineReason: string | null;
  captureReason: string | null;
  reasons: string[];
}

function firstUsableTitle(input: QualityInput): string {
  const candidates = [input.detailTitle, input.title].filter(value => isUsableJobTitle(value));
  if (candidates.length > 0) return String(candidates[0]);
  const rawText = String(input.rawText ?? '');
  return extractRawJobTitle(input.source, rawText)
    || extractUrlJobTitle(input.applicationUrl || input.url, rawText)
    || '';
}

export function evaluateJobQuality(input: QualityInput): QualityEvaluation {
  const title = normalizeSourceJobTitle(input.source, firstUsableTitle(input));
  const reasons: string[] = [];
  const capture = input.rawText === undefined || input.rawText === null || input.rawText.trim() === ''
    ? null
    : classifyRawCapture(input.source, input.rawText);
  const captureReason = capture && !capture.valid ? 'invalid raw capture' : null;
  const closingDate = String(input.closingDate ?? '').trim();
  const closingStatus = String(input.closingDateStatus ?? '').trim();
  const deadlineReason = closingDate || closingStatus === 'open_until_filled'
    ? null
    : 'missing application closing metadata';
  const blockReason = title
    ? getPublishBlockReason({
      title,
      department: input.department,
      hours: input.hours,
      salary: input.salary,
      location: input.location,
      unionName: input.unionName,
      availability: input.availability,
      academicSchedule: input.academicSchedule,
      academicWorkload: input.academicWorkload,
      academicOfficeHours: input.academicOfficeHours,
    })
    : 'unusable title';

  if (captureReason) reasons.push(captureReason);
  if (blockReason) reasons.push(blockReason);
  if (deadlineReason) reasons.push(deadlineReason);

  const status: PublicationStatus = reasons.length > 0
    ? 'hidden'
    : input.hasDetails && input.parsedAt
      ? 'fully_parsed'
      : 'soft_parsed';

  return { title, status, blockReason, deadlineReason, captureReason, reasons };
}
