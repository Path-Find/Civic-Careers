export type CareerStage = 'student' | 'early-career' | 'experienced' | 'senior';

const STUDENT_SIGNAL = /\b(?:student|co[- ]?op|intern(?:ship)?)\s+(?:position|role|job|employment|placement|program|opportunity|term|candidate)\b|\bstudent employment\b|\bco[- ]?op program\b/i;
const EARLY_CAREER_SIGNAL = /\b(?:entry[- ]level|early[- ]career|new graduate|recent graduate|graduate program|junior[- ]level)\b/i;
const SENIOR_TITLE_SIGNAL = /\b(?:senior|director|vice president|chief|executive|manager|supervisor|lead|principal)\b/i;
const SENIOR_SOURCE_SIGNAL = /\b(?:manage|manages|managed|managing|supervis(?:e|es|ed|ing)|direct(?:s|ed|ing)?|lead(?:s|ing)?|senior[- ]level|people leadership|team leadership)\b/i;
const EXPERIENCE_SIGNAL = /\b(?:experienced|minimum of|at least|more than|over)\s+(?:\d+\+?|\w+)\s+(?:years?|yrs?)\b|\b\d+\+?\s+(?:years?|yrs?)\s+(?:of\s+)?(?:related\s+)?(?:professional\s+)?experience\b/i;

/**
 * Classify only explicit signals in the source posting. A title by itself is
 * not enough for a senior or experienced classification.
 */
export function classifyCareerStage(input: {
  title?: string | null;
  rawText?: string | null;
  isStudent?: number | boolean | null;
}): CareerStage | null {
  const title = String(input.title ?? '').replace(/\s+/g, ' ').trim();
  const rawText = String(input.rawText ?? '').replace(/\s+/g, ' ').trim();
  const sourceText = `${title} ${rawText}`;

  // Do not let ordinary prose about students/learners turn a professional
  // role into a student career stage. The requirement flag is classified
  // separately from explicit eligibility evidence.
  if ((input.isStudent === 1 || input.isStudent === true)
    || STUDENT_SIGNAL.test(title)
    || /\bstudent employment\b|\bco[- ]?op program\b/i.test(rawText)) {
    return 'student';
  }
  if (EARLY_CAREER_SIGNAL.test(sourceText)) {
    return 'early-career';
  }

  const titleSignalsSenior = SENIOR_TITLE_SIGNAL.test(title);
  if (titleSignalsSenior && SENIOR_SOURCE_SIGNAL.test(rawText)) {
    return 'senior';
  }

  if (EXPERIENCE_SIGNAL.test(rawText)) {
    return 'experienced';
  }
  return null;
}
