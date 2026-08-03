# Issue 159: recurring source boilerplate findings

Investigation date: 2026-08-03

## Scope and method

This is an investigation record only. No product code, parsed job, or database row was edited.

The live Turso `raw_jobs` table was queried for the 70 source names listed in Issue 159. It returned 6,196 raw records. For each source, repeated text was compared across the stored postings, with particular attention to the beginning and end of each posting. The scan grouped exact repeated blocks and normalized repeated phrases; representative raw records were then reviewed to separate:

- portal chrome: cookies, search controls, share forms, session timers, navigation, and vendor footer text;
- employer boilerplate: recurring organization introductions, land acknowledgements, EDI statements, benefits/marketing copy, application instructions, and thank-you footers;
- content to preserve: duties, qualifications, eligibility, location, compensation, posting status, police checks, driver abstracts, and other role-specific conditions.

“Confirmed” below means the text recurred across the reviewed records for that source. It does not mean a cleanup rule is approved. The issue’s later dry-run, representative review, deterministic implementation, zero-change rerun, and regression steps remain intentionally unchecked because this request was investigation-only.

## Source findings

| Source | Raw records | Finding | Cleanup candidate / preservation note |
|---|---:|---|---|
| Algonquin College | 41 | Recurring land acknowledgement, current-employee application note, benefits/marketing footer, and inclusive-workplace copy. | Candidate: employer and application/footer blocks. Preserve role, pay, contract, and teaching details. |
| Brock University | 671 | Recurring land acknowledgement and Brock overview/top-employer/student-experience copy. | Candidate: repeated institutional marketing and land block. Preserve role-specific academic content. |
| City of Barrie | 33 | Recurring city overview, values/culture copy, EEO/accommodation block, application instructions, and job-description disclaimer. | Candidate: employer/admin blocks. Preserve the disclaimer only if it carries a role-specific condition; otherwise it is non-role text. |
| City of Belleville | 13 | Recurring “current opportunities”/thank-you text, application instructions, resume form, and contact/admin text. | Candidate: all repeated portal/application blocks; no duties or qualifications in these blocks. |
| City of Brampton | 24 | Recurring EEO/accommodation block, voluntary self-identification survey, and internal-applicant instructions. | Candidate: application/admin text. Preserve any job-specific internal-only status. |
| City of Brandon | 19 | Recurring complete-description contact instruction, EEO/accommodation, thank-you, and follow-us/application copy. | Candidate: admin/employer footer blocks. |
| City of Brantford | 43 | Recurring city overview, cookie/site navigation, contact/footer, EDI, and benefits copy. | Candidate: portal and employer blocks. Preserve job-specific certificates and conditions. |
| City of Burlington | 28 | Recurring “great career” employer pitch, workplace/benefits/growth copy, online-application instruction, accommodation, and thank-you text. | Candidate: employer and application footer blocks. |
| City of Cambridge | 35 | Recurring portal controls plus city vision/values, privacy, accessibility, and EDI text. | Candidate: portal and employer/admin blocks. Preserve privacy/eligibility wording if it is tied to the application. |
| City of Cornwall | 16 | Recurring Atlas cookie/session UI, city overview, EDI, accessibility, and application/admin text. | Candidate: portal and employer blocks. |
| City of Guelph | 27 | Recurring cookie/share/apply portal chrome and EEO/accessibility statement. | Candidate: portal and employer/admin blocks. |
| City of Hamilton | 133 | Recurring resume-audit/falsification disclaimer, EEO/accessibility/accommodation block, and city overview/values copy. | Candidate: generic disclaimer and employer blocks. Preserve any explicit hiring condition. |
| City of Kitchener | 38 | Recurring SAP cookie-consent/session blocks and navigation. No additional narrowly separable source-specific non-role block was confirmed in this pass. | Candidate: portal chrome only; do not remove role text based on generic repeated wording. |
| City of London | 47 | Recurring anti-racism/anti-oppression and city overview copy, career marketing, accessibility statement, and contact footer. | Candidate: employer/contact blocks. |
| City of Markham | 41 | Recurring supported-browser warning and municipal employer-award/marketing copy. | Candidate: browser and employer marketing blocks. |
| City of Niagara Falls | 14 | Recurring apply-through-Workday instructions and accessible/inclusive-organization copy. | Candidate: application and employer/accessibility blocks. |
| City of Oshawa | 21 | Recurring EEO/EDI/accommodation block, human-resources contact/footer, and city marketing copy. | Candidate: employer/admin blocks. |
| City of Ottawa | 37 | Recurring alert/search chrome, EDI/accessibility/accommodation text, save-poster instruction, and thank-you footer. | Candidate: portal and generic application/footer blocks. |
| City of Peterborough | 7 | Recurring cookie/site-contact text and EDI/equal-opportunity/thank-you footer. | Candidate: portal and employer/footer blocks. |
| City of Red Deer | 33 | Recurring employer overview, AI/unauthorized-resource interview rule, session/AI-assist portal text, and thank-you footer. | Candidate: portal and generic employer/application blocks. Preserve the AI rule if it is treated as an application instruction. |
| City of Richmond Hill | 25 | Recurring alert chrome, internal-candidate instructions, EEO/accommodation, and thank-you footer. | Candidate: portal and generic application/footer blocks. |
| City of Sarnia | 7 | Recurring supported-browser warning and municipal employer/community overview. | Candidate: browser and employer overview; no narrower role-independent footer confirmed. |
| City of St. Catharines | 35 | Recurring “what’s in it for you”/employer marketing, EEO/accessibility, and “don’t meet every requirement” copy. | Candidate: employer and encouragement blocks. Preserve qualifications themselves. |
| City of St. Thomas | 10 | Recurring online application/account/upload instructions and qualification-question notice. | Candidate: application instructions; preserve actual qualification questions/requirements. |
| City of Thunder Bay | 52 | Recurring navigation, internal-employee instructions, cookie/analytics notice, contact/footer, and careers-page copy. | Candidate: portal and employer/admin blocks. Preserve internal-only competition status. |
| City of Toronto | 195 | Recurring cookie notice, alert/search chrome, EEO/inclusiveness, accessibility, and accommodation blocks. | Candidate: portal and employer/admin blocks. |
| City of Vancouver | 58 | Recurring alert/search chrome, employer-award/marketing text, EDI, and accommodation copy. | Candidate: portal and employer/admin blocks. |
| City of Victoria | 29 | Recurring cookie/share/apply chrome, online-profile/application instructions, EDI, and accommodation copy. | Candidate: portal and employer/application blocks. |
| City of Waterloo | 34 | Recurring translation widget, city “why work with us” overview, EDI/accessibility, and posting-status UI. | Candidate: portal and employer blocks. Preserve posting status and location. |
| City of Welland | 8 | Recurring duties disclaimer, EEO/accessibility/accommodation, and thank-you/application footer. | Candidate: generic disclaimer and footer. Preserve actual duties and requirements. |
| City of Windsor | 36 | Recurring job-board introduction, resume form, accessibility/accommodation, and verification/application text. | Candidate: portal and generic employer/application blocks. Preserve verification conditions when role-specific. |
| City of Winnipeg | 49 | Recurring PeopleSoft/SAP search-result and navigation chrome. | Candidate: portal chrome only; no separate source-specific role-text block confirmed. |
| CMHC | 136 | Recurring EDI/employer-mission copy, “applied before” encouragement, benefits/marketing, and alert/search chrome. | Candidate: employer and portal blocks. Preserve eligibility and job-specific benefits/compensation. |
| Conservation Halton | 14 | Recurring employer values/benefits and privacy/collection footer. Several postings also explicitly repeat standing-posting status. | Candidate: generic employer/privacy footer. Preserve standing-posting status and eligibility/privacy requirements. |
| CreateTO | 2 | Two records are the same Housing Development Intern posting in different BambooHR shells; not two independent postings. | Insufficient evidence for a source-wide rule. The posting contains recurring application, AI-screening, hybrid-work, and contact/admin text, but no cross-posting confirmation. |
| Durham College | 18 | Recurring college overview, land acknowledgement, benefits/growth, and employer copy. | Candidate: institutional/employer blocks. Preserve teaching/course/role information. |
| EFHC | 10 | Recurring portal cookie/session/AI-assist text and institutional/land-acknowledgement copy; the stored text includes mixed employer/template material. | Candidate: portal chrome only until source attribution is clarified; do not create a content rule from the mixed template. |
| Fanshawe College | 26 | Recurring cookie chrome, current-employee Workday instruction, employer culture/benefits/growth copy, and application text. | Candidate: portal, employer, and internal-application blocks. |
| George Brown College | 8 | Recurring land acknowledgement, EDI/accessibility, credential-validation, and application/footer text. | Candidate: employer/admin blocks. Preserve actual credential requirements for the role. |
| Government of Canada | 871 | Multiple federal templates recur. Confirmed common candidates include “We thank all those who apply…”/selection footer and generic inclusive/barrier-free accommodation footer; portal shells also recur. | Candidate: exact generic selection/accommodation footers only. Preserve “Who can apply,” citizenship/residency preference, assessments, salary, closing dates, and other federal eligibility or role content. |
| Halton Region | 41 | Recurring EDI/accommodation block and alert/search chrome. | Candidate: employer/admin blocks. |
| Humber College | 29 | Recurring career-portal navigation/session text and EDI/accessibility/accommodation copy. | Candidate: portal and employer/admin blocks. |
| Infrastructure Ontario | 17 | Recurring AI applicant-tracking disclosure, EDI/accommodation, and “you may not meet all qualifications” encouragement. | Candidate: generic recruitment disclosures/encouragement. Preserve the qualifications and any role-specific eligibility. |
| Metrolinx | 145 | Recurring employer introduction, application process, internal-applicant instructions, background-information warning, thank-you, equitable-employer/EDI, and accommodation blocks. | Confirmed source-specific candidates; existing uncommitted cleanup rules were not changed or validated as part of this investigation. Preserve work eligibility and role requirements. |
| Mississauga | 62 | Recurring alert/search chrome and City employer EDI/about-us copy. | Candidate: portal and employer blocks. |
| Mohawk College | 8 | Recurring EDI/reconciliation, accessibility/accommodation, careers-page thank-you, and analytics/template text. | Candidate: employer/admin and portal blocks. |
| Municipality of Clarington | 21 | Recurring supported-browser warning, employer “future is bright”/EDI copy, and ADP/legal footer. | Candidate: portal and employer/legal footer blocks. |
| Northumberland County | 3 | All three records repeat cookie/privacy consent, accommodation, FOIP/privacy, HR contact, and headquarters footer text. | Confirmed source-specific admin/footer candidates. Preserve role-specific conditions. |
| OCAD University | 92 | Recurring cookie notice, land acknowledgement, accessibility, Canadian/permanent-resident priority, and thank-you footer. | Candidate: cookie, land, and generic employer/footer blocks. Preserve the stated eligibility/priority. |
| Ontario Tech University | 10 | Recurring EDI/indigenization/decolonization copy, encouragement to apply, Canadian eligibility/priority, and footer text. | Candidate: generic employer/footer blocks. Preserve eligibility wording. |
| Peel Region | 39 | Recurring cookie/share/apply chrome, employer EDI/about-us block, and regional services overview. | Candidate: portal and employer blocks. |
| Region of Waterloo | 57 | Recurring extensive cookie-consent/session/analytics/privacy blocks. No separate source-specific non-role block was confirmed beyond that portal material. | Candidate: portal chrome only in this pass. |
| Seneca College | 35 | Recurring Seneca overview, workplace/growth/benefits, accessibility, and recruitment-verification copy. | Candidate: employer/admin blocks. Preserve conditional pre-employment verification requirements. |
| Toronto District School Board | 12 | Recurring TDSB overview, accommodation/EDI, AI-recruitment disclosure, and application-administration blocks. | Confirmed source-specific candidates; existing uncommitted cleanup rules were not changed or validated here. |
| Town of Ajax | 17 | Recurring existing-vacancy statement, internal Workday application instructions, and equal-opportunity/equity copy. | Candidate: generic application/employer blocks. Preserve vacancy status and internal-only conditions. |
| Town of Aurora | 11 | Recurring supported-browser warning and town overview/vision/mission/workforce copy. | Candidate: browser and employer marketing blocks. |
| Town of Caledon | 41 | Recurring supported-browser warning, contact/address footer, EEO/accommodation, and diversity copy. | Candidate: portal, employer, and contact blocks. |
| Town of Milton | 31 | Recurring EEO/EDI/accommodation and online-application instructions. | Candidate: generic employer/application blocks. |
| Town of Oakville | 52 | Recurring application receipt/instructions, contact details, resume/cover-letter workflow, and AI screening disclosure. | Candidate: application/admin blocks. Preserve any role-specific screening or eligibility statement. |
| Town of Orangeville | 4 | Three of four records repeat EEO/accommodation/privacy and conditional police/background-check text; all four repeat AI applicant-tracking/application instructions. | Candidate: generic EEO/privacy/AI/admin blocks. Preserve conditional police/background requirements where applicable. |
| Town of Whitby | 15 | Recurring employer/team/town overview and “grow together” marketing copy. | Candidate: employer marketing block. |
| TRCA | 13 | Recurring application/upload instructions, selection thank-you, EEO/accessibility, and conditional vulnerable-sector/driver-abstract text. | Candidate: generic application/footer blocks. Preserve screening conditions when stated for the role. |
| TTC | 59 | Recurring AI-use prohibition, corporate mission/plan, and recruitment-process text. | Candidate: generic application/employer block, but preserve the AI-use rule if it is treated as a required assessment instruction. |
| University of Guelph | 100 | Recurring extensive cookie/session/analytics and career-navigation chrome. | Candidate: portal chrome. No additional narrowly separable source-specific role-text block confirmed in this pass. |
| University of Ottawa | 1,684 | Recurring Workday/footer material and a policy block about the suspended-but-reinstatable COVID-19 vaccination policy. | Candidate: portal footer only. Preserve the vaccination policy because it can function as an eligibility condition. |
| University of Toronto | 478 | Recurring alert/search chrome, EDI/belonging, accessibility/accommodation, and employer footer text. | Candidate: portal and generic employer/admin blocks. |
| University of Waterloo | 106 | Recurring University employer-branding, workplace/benefits/growth copy across 103 records; three records differ in template shape. | Candidate: employer marketing block. Preserve role-specific duties, qualifications, and conditions. |
| Vaughan Public Library | 3 | All three records repeat application form fields, availability requirements, upload instructions, and site navigation. | Candidate: form/navigation boilerplate. Preserve availability requirements because they are application eligibility. |
| Waterfront Toronto | 1 | One Senior Manager posting only. It contains organizational overview, EDI/accommodation, and AI-recruitment disclosure, but there is no second posting for comparison. | Insufficient evidence for a source-wide rule. Do not mark a pattern confirmed from one record. |
| York Region | 66 | Recurring cookie notice, application deadline/instructions, career-line contact, thank-you/selection footer, site footer, and share controls. | Candidate: portal and generic application/footer blocks. Preserve deadlines, eligibility, location, and role conditions. |

## Current conclusion

There are confirmed candidates in most sources, but the recurring text is not one universal phrase. It falls into source-template families: portal chrome, employer/EDI/land-acknowledgement blocks, application instructions, and selection/accommodation footers. The safest next implementation unit is source-specific deterministic rules with representative before/after review. Generic keyword deletion would risk removing eligibility, posting status, police-check/driver-abstract conditions, or role-specific application requirements.

No cleanup was applied, no parsed descriptions were changed, and no source was marked as having a confirmed rule solely from one posting or from the duplicated CreateTO records.
