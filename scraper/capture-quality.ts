export type RawCaptureIssue =
  | 'empty'
  | 'unrendered'
  | 'error_page'
  | 'bot_challenge'
  | 'expired_page'
  | 'generic_portal';

export type RawCaptureQuality =
  | { valid: true }
  | { valid: false; issue: RawCaptureIssue };

/** Text-only page states that are not job postings. */
export function looksUnrendered(text: string): boolean {
  return (/skip to main content/i.test(text) && text.length < 400)
    || /skip to (?:main )?content\s*loading(?:\.\.\.)?/i.test(text)
    || /^loading\.\.\.\s+skip to (?:main )?content/i.test(text.trim())
    || /resource you have requested is not available/i.test(text)
    || /La ressource que vous avez demandée n'est pas disponible/i.test(text);
}

const BOT_CHALLENGE = /(?:checking your browser|confirm you are not a robot|please verify you are human|activity and behavior on (?:this )?site made us think that you are a bot|activity and behavior on this website made us think that you are a bot|incident id:\s*[a-f0-9-]{8,})/i;
const OBJECT_STORAGE_ERROR = /(?:^|\n)\s*404 not found\b|NoSuchKey|specified key does not exist/i;
const EXPIRED_PAGE = /(?:this (?:position|job|posting) is no longer available|sorry, (?:this )?posting is no longer available|this job has (?:already )?expired|this job posting has already expired|this posting is not available|sorry, this position has been filled)\.?/i;

export function classifyRawCapture(source: string, rawText: string): RawCaptureQuality {
  const text = rawText.trim();
  if (!text) return { valid: false, issue: 'empty' };
  if (looksUnrendered(text)) return { valid: false, issue: 'unrendered' };
  if (OBJECT_STORAGE_ERROR.test(text)) return { valid: false, issue: 'error_page' };
  if (BOT_CHALLENGE.test(text)) {
    // hCaptcha or reCAPTCHA widgets embedded in a real job detail page often contain static labels 
    // like "Confirm you are not a robot" or "Please verify you are human".
    // A real bot challenge page will be very short and won't contain typical job-posting keywords.
    const hasJobKeywords = /\b(?:requisition|qualifications|responsibilities|experience|education|duration|benefits)\b/i.test(text);
    if (!hasJobKeywords || text.length < 1500) {
      return { valid: false, issue: 'bot_challenge' };
    }
  }
  if (EXPIRED_PAGE.test(text)) return { valid: false, issue: 'expired_page' };

  // The National Gallery's generic talent-community page can be captured
  // under a real GC job title. Keep this source-specific and conservative.
  if (source === 'Government of Canada'
    && /Join Our Talent Community/i.test(text)
    && /Current Openings\s*\(\s*1\s+of\s+1\s*\)/i.test(text)
    && !/\b(?:job requisition id|posted on|salary range|employment tenure|who can apply|position summary|duties|qualifications|responsibilities)\b/i.test(text)) {
    return { valid: false, issue: 'generic_portal' };
  }

  // GC Jobs can return its search/alert shell under a real poster ID when the
  // detail page is blocked or fails to render. The shell has no posting body.
  if (source === 'Government of Canada'
    && /Search by Keyword/i.test(text)
    && /(?:Select how often|Search by Location|Create Alert)/i.test(text)
    && !/\b(?:position summary|job description|duties|qualifications|responsibilities|salary|closing date|who can apply|employment status|reference number|selection process number)\b/i.test(text)) {
    return { valid: false, issue: 'generic_portal' };
  }

  // ICBC talent-community pages are recruitment pools, not individual jobs.
  if (source === 'ICBC'
    && /\b(?:talent\s+community|talent\s+pool)\b/i.test(text)
    && !/\b(?:position\s+highlights|position\s+requirements)\b/i.test(text)) {
    return { valid: false, issue: 'generic_portal' };
  }

  // SaskTel can return a cookie shell under a job-shaped title when the
  // posting body did not render at all.
  if (source === 'SaskTel'
    && !/\b(?:job\s+description|position\s+summary|salary\s*:|location\s*:|closing\s+date|apply\s+by|department\s*:|employment\s+type)\b/i.test(text)) {
    return { valid: false, issue: 'generic_portal' };
  }

  if (source === 'Toronto Metropolitan University'
    && (text.match(/Search Results/gi)?.length ?? 0) >= 10
    && !/\b(?:responsibilities|qualifications|requirements|salary\s*[:\-]|location\s*[:\-]|job\s+summary)\b/i.test(text)) {
    return { valid: false, issue: 'generic_portal' };
  }

  // Western PeopleSoft detail URLs can return the full search-results table
  // instead of the selected posting. It contains many real-looking titles,
  // but no role-specific body, so never treat it as a job capture.
  if (source === 'Western University'
    && /Search Results List/i.test(text)
    && /\b\d+\s+jobs?\s+found\b/i.test(text)
    && /Job Title\s*Job ID\s*Department\s*Employee Group/i.test(text)) {
    return { valid: false, issue: 'generic_portal' };
  }

  // Durham PeopleSoft can return the sign-in/search shell for a detail URL.
  if (source === 'Durham Region'
    && /Employment Opportunities\s*Employment Opportunities/i.test(text)
    && !/\b(?:responsibilities|qualifications|requirements|salary\s*[:\-]|location\s*[:\-]|job\s+description|closing\s+date)\b/i.test(text)) {
    return { valid: false, issue: 'generic_portal' };
  }

  return { valid: true };
}
