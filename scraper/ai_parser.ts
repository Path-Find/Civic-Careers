import OpenAI from "openai";
import * as dotenv from "dotenv";
import { validateParsedJob } from "./validate";

dotenv.config();

const deepseekClient = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY || ""
});

const AI_MODEL = process.env.AI_MODEL || "deepseek-v4-flash";

export interface ParsedJob {
    job_title: string;
    department: string;
    location: string;
    salary_min: number | null;
    salary_max: number | null;
    salary_period: 'yearly' | 'hourly' | 'monthly';
    closing_date: string | null;
    work_model: 'Hybrid' | 'Remote' | 'On-site';
    employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Permanent';
    duration: string;
    is_unionized: boolean;
    union_name: string;
    is_student: boolean;
    is_inventory: boolean;
    benefits: string[];
    clean_description: string;
}

export async function parseJobWithAI(description: string): Promise<ParsedJob | null> {
    const today = new Date().toISOString().split('T')[0];
    
    const prompt = `
    Extract the following information from the job description text provided. 
    Return the data in a valid JSON format. Be extremely precise.

    SCHEMA:
    {
      "job_title": "Cleaned title (remove IDs/Internal labels)",
      "department": "Department name",
      "location": "City",
      "salary_min": number | null,
      "salary_max": number | null,
      "salary_period": "yearly" | "hourly" | "monthly",
      "closing_date": "YYYY-MM-DDTHH:MM:SS" | "YYYY-MM-DD" | null,
      "work_model": "Hybrid" | "Remote" | "On-site",
      "employment_type": "Full-time" | "Part-time" | "Contract" | "Permanent",
      "duration": "Length of contract if applicable",
      "is_unionized": boolean,
      "union_name": "Union name or Non-Union",
      "is_student": boolean,
      "is_inventory": boolean,
      "benefits": ["pension", "health", "dental", etc],
      "clean_description": "Full job description in Markdown with NORMALIZED section headers. You MUST rename every section heading to one of these five standard headers — no exceptions, no source-specific names allowed:\n## Overview — role summary, what this position does, org context specific to the role\n## Responsibilities — duties, tasks, what you will do (e.g. 'What will I be doing?', 'General Duties', 'Summary of Duties', 'Key Responsibilities', 'Accountabilities')\n## Qualifications — requirements, must-haves, skills, education, experience (e.g. 'What Skills Do You Bring?', 'Knowledge and Skills Required', 'Education and Experience', 'Requirements')\n## Nice to Have — preferred/asset qualifications only (omit this section if none exist)\n## Compensation & Benefits — additional pay or perks detail beyond what is already in the salary fields (omit if redundant)\nPreserve all bullet points and paragraph content exactly — do not summarize or condense. Strip: generic company boilerplate (mission statements, 'we are an equal opportunity employer' paragraphs, accommodation notices), site navigation, cookie notices, 'Share this page' widgets, social media buttons, and application instructions."
    }

    CONSTRAINTS:
    - If salary is a range like "$96,566.00 - $132,880.00", salary_min = 96566, salary_max = 132880.
    - If salary is hourly, keep it hourly (do not multiply).
    - Closing date: infer the date if it says "Closing in 2 weeks" relative to today (${today}). If a closing time is listed (e.g. "4:30 PM", "11:59 PM"), include it as "YYYY-MM-DDTHH:MM:SS" in 24-hour format. If only a date is listed, use "YYYY-MM-DD".

    Text:
    ${description}
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
            return null;
        }

        return validateParsedJob(JSON.parse(content));
    } catch (error: any) {
        console.error(`AI parsing error (${AI_MODEL}):`, error.message);
        return null;
    }
}
