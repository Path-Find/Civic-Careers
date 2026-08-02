import OpenAI from "openai";
import * as dotenv from "dotenv";
import { validateParsedJob } from "./validate";

dotenv.config();

const deepseekClient = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY || ""
});

const AI_MODEL = process.env.AI_MODEL || "deepseek-v4-flash";

// Bump whenever the prompt below (or AI_MODEL) changes meaningfully enough that
// old parses may no longer match what the current prompt would produce. Stamped
// onto every job_details row so stale-version jobs can be found and selectively
// reparsed via reparse-stale.ts instead of reparsing (and re-billing) everything.
export const PARSER_VERSION = 2;

export interface ParsedJob {
    job_title: string;
    department: string;
    location: string;
    salary_min: number | null;
    salary_max: number | null;
    salary_period: 'yearly' | 'hourly' | 'monthly' | 'flat';
    closing_date: string | null;
    work_model: 'Hybrid' | 'Remote' | 'On-site';
    employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Permanent';
    duration: string;
    is_unionized: boolean;
    union_name: string;
    is_student: boolean;
    is_inventory: boolean;
    benefits: string[];
    required_skills: string[];
    responsibility_tags: string[];
    qualification_tags: string[];
    clean_description: string;
}

// DeepSeek peak hours (UTC): 1–4 AM and 6–10 AM
function msUntilOffPeak(): number {
    const now = new Date();
    const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
    const isPeak = (mins >= 60 && mins < 240) || (mins >= 360 && mins < 600);
    if (!isPeak) return 0;
    const targetMins = mins < 240 ? 240 : 600; // wait until 4 AM or 10 AM UTC
    return (targetMins - mins) * 60 * 1000 - now.getUTCSeconds() * 1000;
}

export type ParseResult =
  | { data: ParsedJob; error?: undefined }
  | { data: null; error: string };

export async function parseJobWithAI(description: string, titleHint?: string): Promise<ParseResult> {
    const wait = msUntilOffPeak();
    if (wait > 0) {
        console.log(`\n[Parser] DeepSeek peak hours — waiting ${Math.ceil(wait / 60000)} min until off-peak...`);
        await new Promise(r => setTimeout(r, wait));
    }

    const today = new Date().toISOString().split('T')[0];
    
    const knownTitle = titleHint?.trim();
    const titleInstruction = knownTitle
      ? `A trusted listing title was captured from the source results page: "${knownTitle}". Use this exact value for job_title unless the posting clearly shows a more specific expanded title.`
      : 'No trusted listing title is available; extract job_title from the posting text.';

    const prompt = `
    Extract the following information from the job description text provided. 
    Return the data in a valid JSON format. Be extremely precise. Prioritize accurate extraction of closing_date above all else.

    SCHEMA:
    {
      "closing_date": "YYYY-MM-DDTHH:MM:SS" | "YYYY-MM-DD" | null  (MOST IMPORTANT - look for any 'closing', 'apply by', 'deadline', 'expires', date in future relative to ${today}),
      "job_title": "Cleaned title (remove IDs/Internal labels)",
      "department": "Department name",
      "location": "City",
      "salary_min": number | null,
      "salary_max": number | null,
      "salary_period": "yearly" | "hourly" | "monthly" | "flat" (flat = a single lump-sum payment for the whole assignment, not a recurring rate — use for per-course, per-assignment, stipend, honorarium, or one-time project fees. e.g. '$7,887.59 per half course' is flat, NOT yearly, even though it's the only pay mentioned),
      "work_model": "Hybrid" | "Remote" | "On-site",
      "employment_type": "Full-time" | "Part-time" | "Contract" | "Permanent",
      "duration": "Length of contract if applicable",
      "is_unionized": boolean,
      "union_name": "Union name or Non-Union",
      "is_student": boolean,
      "is_inventory": boolean,
      "benefits": ["pension", "health", "dental", etc],
      "required_skills": "Specific named tools, software, programs, languages, systems, or certifications the posting asks for — e.g. ['Excel', 'AutoCAD', 'SQL', 'AutoCAD Civil 3D', 'French language proficiency']. Only concrete named things a candidate would list on a resume, NOT generic soft-skill phrases like 'strong communication' or 'attention to detail'. Empty array if none are named.",
      "clean_description": "Full job description in Markdown with NORMALIZED section headers. You MUST rename every section heading to one of these five standard headers — no exceptions, no source-specific names allowed:\n## Overview — role summary, what this position does, org context specific to the role\n## Responsibilities — duties, tasks, what you will do (e.g. 'What will I be doing?', 'General Duties', 'Summary of Duties', 'Key Responsibilities', 'Accountabilities')\n## Qualifications — requirements, must-haves, skills, education, experience (e.g. 'What Skills Do You Bring?', 'Knowledge and Skills Required', 'Education and Experience', 'Requirements')\n## Nice to Have — preferred/asset qualifications only\n## Compensation & Benefits — additional pay or perks detail beyond what is already in the salary fields\n\nOMIT RULE (strict): if a section would have no real content, DELETE the entire heading AND body — do not emit the heading with 'None', 'N/A', 'Not specified', or any placeholder text as the body. A section either has genuine content or does not exist in the output at all. This includes Overview: if the only available summary text is pure administrative filler that just restates facts already captured elsewhere as separate fields (e.g. 'This job advertisement is to fill an existing vacancy in the CUPE4207-1 Employee Group for the course BIOL 3P92' only restates department/union/course-code, nothing about the actual work) with no real description of the role, omit Overview entirely rather than including empty filler.\n\nLIST FORMATTING (strict): render every list item as a '-' bullet. Never use numbered lists (1. 2. 3.) UNLESS the source text is describing a genuinely sequential process with an explicit order (e.g. application steps) — job requirements, duties, and qualifications are NEVER numbered, even if the source site numbered them.\n\nRESPONSIBILITIES MEANING (strict): every bullet under Responsibilities must be an action a person does (starts with a verb — 'Deliver', 'Grade', 'Maintain', 'Inspect', etc). Never bullet raw data — hour/workload breakdowns, category-to-number tables (e.g. 'Contact with Students: 27 hours', 'Grading: 33 hours', 'Total Work Hours: 65'), or other arithmetic/tabular content copied straight from the source. If the source expresses duties as a workload table like that, translate it into 1-2 sentences of prose describing the duties, and if a total-hours figure is genuinely useful context, fold it into Compensation & Benefits as a single sentence instead of leaving it under Responsibilities.\n\nCOMPRESSION (strict): this is NOT a transcription task. Corporate and legal boilerplate padding must be CUT, not paraphrased — delete framing sentences like 'Duties and responsibilities will be in accordance with Article 22.01 of the Collective Agreement' entirely (a contract citation, not a duty — is_unionized/union_name already capture that this is a unionized role) and similar throat-clearing ('The successful candidate will be responsible for...', 'This position requires the incumbent to...'). What remains should read as short, direct bullets — aim for roughly a QUARTER of the source word count under Responsibilities and Qualifications, while still capturing every distinct duty/requirement as its own bullet (compress the phrasing, never drop a distinct duty). Example — source: 'Duties and responsibilities will be in accordance with Article 22.01 of the Collective Agreement. These include scheduled contact time with students and non-classroom time (preparation of lectures, student consultation, marking and grading and course administration, including grade appeals and cases of academic dishonesty).' becomes:\n- Deliver lectures and hold student consultation hours\n- Grade assignments and handle grade appeals/academic dishonesty cases\n- Manage course administration\n\nStrip entirely (not compress — remove): generic company boilerplate (mission statements, 'we are an equal opportunity employer' paragraphs, accommodation notices), land acknowledgements / territorial acknowledgements, employer branding and self-promotion (awards, 'Top Employer' rankings, magazine/media recognitions, marketing taglines and slogans like 'Ignite your career' or 'Break through at X'), site navigation, cookie notices, 'Share this page' widgets, social media buttons, and application instructions."
    }

    OVERVIEW RULES (strict): Overview is about the job, never a company profile. Start with what the person in this role does. Do not include the employer's history, mission, services, facility description, neighbourhood description, or promotional introduction. Keep Overview to at most two sentences. If the source has no role-specific summary after removing company boilerplate, omit Overview entirely.

    CLASSIFICATION RULE (strict): Check every source requirement and classify all that apply. Put mandatory education, experience, registration, licensing, legal, employment, and student-eligibility conditions under Qualifications. Put only genuinely optional assets or preferences under Nice to Have. Never place a mandatory condition under Nice to Have just because the source labels it as an asset or preference.

    TAG OUTPUT RULE (strict): Return responsibility_tags and qualification_tags as arrays using only these exact labels: Education & mentoring, Planning & evaluation, Client care, Operations & compliance, Research & improvement, Collaboration, Equity & advocacy, Student. Check all that apply for each section; return [] when none apply. Student is only a qualification tag. These tags summarize the section's actual content, not just exact words in the text.

    CONSTRAINTS:
    - If salary is a range like "$96,566.00 - $132,880.00", salary_min = 96566, salary_max = 132880.
    - If salary is hourly, keep it hourly (do not multiply).
    - work_model: check the job TITLE as well as the body. Delivery-format words anywhere — 'Online', 'Virtual', 'Remote', 'Distance', 'e-Learning', 'Asynchronous' — mean Remote, even if they only appear as a title suffix like "Course Name (Online)". 'Hybrid' or 'blended' means Hybrid. Only use On-site when none of these signals appear anywhere.
    - Closing date: Be aggressive - infer from any mention of close/apply/deadline/expire. Use today=${today} for relative dates like "in 2 weeks". Include time if present as YYYY-MM-DDTHH:MM:SS. Date only as YYYY-MM-DD. Return null only if no date info at all.

    Text:
    ${description}

    TITLE INSTRUCTION:
    ${titleInstruction}
    `;

    try {
        const completion = await deepseekClient.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: AI_MODEL,
            response_format: { type: "json_object" },
            timeout: 60000
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            console.error("AI returned empty content");
            return { data: null, error: "AI returned empty content" };
        }

        const parsed = JSON.parse(content);
        const validated = validateParsedJob(parsed, knownTitle);
        if (!validated) {
            const keys = parsed && typeof parsed === 'object' ? Object.keys(parsed).join(', ') : typeof parsed;
            const preview = content.replace(/\s+/g, ' ').slice(0, 240);
            return { data: null, error: `permanent: AI response missing usable job_title (keys: ${keys || 'none'}; preview: ${preview})` };
        }
        return { data: validated };
    } catch (error: any) {
        if (error instanceof SyntaxError) {
            const preview = String(error.message).slice(0, 180);
            return { data: null, error: `permanent: AI returned invalid JSON (${preview})` };
        }
        console.error(`AI parsing error (${AI_MODEL}):`, error.message);
        return { data: null, error: `AI parsing error (${AI_MODEL}): ${error.message}` };
    }
}
