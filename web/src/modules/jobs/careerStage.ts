export const CAREER_STAGES = [
  { value: 'student', label: 'Student' },
  { value: 'early-career', label: 'Early career' },
  { value: 'experienced', label: 'Experienced' },
  { value: 'senior', label: 'Senior' },
] as const;

export type CareerStage = typeof CAREER_STAGES[number]['value'];

export function careerStageLabel(value: string | null | undefined): string | null {
  return CAREER_STAGES.find(stage => stage.value === value)?.label ?? null;
}
