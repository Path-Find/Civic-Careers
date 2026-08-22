export const OVERSIZED_JOB_SECTION_CHARS = 5_000;

const TARGET_SECTION = /^(?:responsibilities|qualifications)$/i;

export function hasOversizedJobSection(description: string | null | undefined): boolean {
  if (!description) return false;
  return description
    .split(/(?=^#{1,3}\s+)/m)
    .some(chunk => {
      const heading = chunk.match(/^#{1,3}\s+(.+?)(?:\n|$)/)?.[1]?.trim() ?? '';
      return TARGET_SECTION.test(heading) && chunk.length > OVERSIZED_JOB_SECTION_CHARS;
    });
}
