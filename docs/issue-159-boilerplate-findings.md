# Issue 159: source boilerplate findings

Date checked: 2026-08-03
Database checked: live Turso `raw_jobs` table
Scope: the 70 source names listed in Issue 159

## Method

I queried the raw postings for each of the 70 listed sources. The query returned 6,196 rows. I grouped records by `source`, compared repeated text across postings, and manually reviewed representative top and bottom text for each source. The counts below are the number of raw rows available at the time of review, not a count of currently active jobs.

I classified a repeated block as a candidate only when it is source-specific and does not describe the role. Portal controls, cookie notices, search forms, employer marketing, land acknowledgements, application instructions, and routine hiring notices are separate from duties, qualifications, eligibility, location, and compensation. Eligibility and job-specific checks must remain even when their surrounding wording repeats.

## Source findings

| Source | Raw rows | Finding |
| --- | ---: | --- |
| Algonquin College | 41 | Repeated land acknowledgement, current-employee application instruction, benefits/employer footer, and compensation marketing. These are non-role blocks; keep the posting-specific fields. |
| Brock University | 671 | Repeated land acknowledgement and Brock employer/student-experience marketing appear in every posting. Candidate employer boilerplate; no role duties are in those blocks. |
| City of Barrie | 33 | Repeated city overview, corporate-values section, equal-opportunity/accommodation footer, application instructions, and job-description disclaimer. Clear source boilerplate. |
| City of Belleville | 13 | Repeated “thank you/current opportunities,” apply instructions, resume form controls, email instructions, and interview notice. Clear application/portal boilerplate. |
| City of Brampton | 24 | Repeated equal-opportunity/accommodation footer, voluntary self-identification survey, and internal-applicant instructions. Clear administrative boilerplate. |
| City of Brandon | 19 | Repeated “request a complete job description,” equal-opportunity/accommodation and thank-you text, and follow-us/application instructions. Clear administrative boilerplate. |
| City of Brantford | 43 | Repeated cookie/site navigation, city overview, contact/footer, benefits, and EDI employer text. Clear portal and employer boilerplate. |
| City of Burlington | 28 | Repeated “great career” employer pitch, workplace/benefits marketing, online-application instructions, accommodation, and thank-you text. Candidate employer/application boilerplate. |
| City of Cambridge | 35 | Repeated portal controls plus city values/vision, privacy notice, EDI, and accommodation text. Clear non-role blocks; preserve job-specific requirements. |
| City of Cornwall | 16 | Repeated Atlas cookie/session controls, city marketing, EDI, accommodation, and application text. Clear portal/employer boilerplate. |
| City of Guelph | 27 | Repeated cookie/share/apply controls and equal-opportunity/accommodation footer. Clear portal/employer boilerplate. |
| City of Hamilton | 133 | Repeated city marketing, resume-audit/falsification disclaimer, and equal-opportunity/accommodation terms. Clear administrative/employer boilerplate. |
| City of Kitchener | 38 | Repeated SAP cookie-consent and session/privacy blocks dominate the raw text. Portal boilerplate is confirmed; no additional narrowly separable employer block was needed for this pass. |
| City of London | 47 | Repeated city/ARAO overview, career marketing, accessibility statement, and contact footer. Clear employer boilerplate. |
| City of Markham | 41 | Repeated unsupported-browser notice and employer-awards/municipal marketing. Clear portal/employer boilerplate. |
| City of Niagara Falls | 14 | Repeated cover-letter/resume application instructions and accessibility/inclusive-employer text. Candidate administrative boilerplate. |
| City of Oshawa | 21 | Repeated equal-opportunity/accommodation text, site contact/footer, and city marketing. Clear employer boilerplate. |
| City of Ottawa | 37 | Repeated alert controls, EDI/accommodation text, save-poster instruction, and thank-you/interview notice. Clear portal/application boilerplate. |
| City of Peterborough | 7 | Repeated cookie/site contact blocks and EDI/equal-opportunity thank-you text. Clear portal/employer boilerplate. |
| City of Red Deer | 33 | Repeated employer overview, AI/interview-assessment prohibition, and thank-you/interview notice. Candidate administrative/employer boilerplate; preserve any job-specific assessment requirement. |
| City of Richmond Hill | 25 | Repeated alert controls, internal-applicant instruction, vacancy label, EDI/accommodation, and thank-you text. Clear administrative boilerplate. |
| City of Sarnia | 7 | Repeated unsupported-browser notice and city/employer overview. Portal and employer marketing are non-role; no narrower rule was required from this sample. |
| City of St. Catharines | 35 | Repeated “what’s in it for you” employer marketing, EDI/accommodation, and “don’t meet every requirement” text. Clear source-specific candidate boilerplate. |
| City of St. Thomas | 10 | Repeated account creation, upload, application-question, and apply instructions. Clear application boilerplate. |
| City of Thunder Bay | 52 | Repeated navigation, internal-employee instructions, cookie notice, contact/footer, and careers-page text. Clear portal/admin boilerplate. |
| City of Toronto | 195 | Repeated cookie and alert controls plus equal-opportunity, accessibility, and accommodation blocks. Clear portal/employer boilerplate. |
| City of Vancouver | 58 | Repeated alert controls, employer-award/municipal marketing, EDI, and accommodation text. Clear source-specific employer boilerplate. |
| City of Victoria | 29 | Repeated cookie/share/apply controls, online-profile instructions, EDI/accommodation, and application deadline instructions. Clear portal/application boilerplate. |
| City of Waterloo | 34 | Repeated Google Translate controls plus city “why work with us” and EDI marketing. Clear portal/employer boilerplate. |
| City of Welland | 8 | Repeated duties disclaimer, equal-opportunity/accommodation, thank-you, and application blocks. Clear administrative boilerplate. |
| City of Windsor | 36 | Repeated job-board introduction, resume form controls, accommodation, verification, and interview notice. Clear portal/application boilerplate. |
| City of Winnipeg | 49 | Repeated PeopleSoft search/result controls and portal shell. Portal boilerplate is confirmed; no separate source-wide employer block was needed for this pass. |
| CMHC | 136 | Repeated employer mission/EDI, benefits/recruitment encouragement, “apply again” text, and alert controls. Clear employer/portal boilerplate. |
| Conservation Halton | 14 | Repeated employer values/benefits and privacy/FOIP collection footer. Standing-posting status and eligibility language must remain because they describe the opportunity. |
| CreateTO | 2 | Both rows represent the same Housing Development Intern posting (one detailed record and one portal shell), not two independent postings. Insufficient evidence for a source-wide cleanup rule. |
| Durham College | 18 | Repeated college overview, land acknowledgement, benefits, and employer marketing. Candidate non-role employer boilerplate. |
| EFHC | 10 | Repeated portal cookie/session and AI-assist controls plus employer/land-acknowledgement text. Candidate portal/employer boilerplate; source attribution should be checked before any rule. |
| Fanshawe College | 26 | Repeated cookie notice, current-employee Workday instruction, employer culture, and benefits/development text. Clear portal/employer boilerplate. |
| George Brown College | 8 | Repeated land acknowledgement, EDI/accommodation, credential-proof, and application text. Clear employer/application boilerplate; keep actual credential requirements. |
| Government of Canada | 871 | Repeated “We thank all those who apply…” / “only those selected…” and inclusive barrier-free accommodation blocks occur across varied federal posting formats. These two narrow footer patterns are candidates; preserve eligibility, preference, assessment, and position-specific instructions. |
| Halton Region | 41 | Repeated accessibility/accommodation, EDI, and alert controls. Clear employer/portal boilerplate. |
| Humber College | 29 | Repeated portal navigation, inactivity/session controls, and EDI/accommodation text. Clear portal/employer boilerplate. |
| Infrastructure Ontario | 17 | Repeated AI applicant-tracking disclosure, EDI/accommodation, and “you may not meet every qualification” encouragement. Candidate administrative/employer boilerplate; do not remove qualifications themselves. |
| Metrolinx | 145 | Repeated employer introduction, application/internal-applicant process, inaccurate-information warning, thank-you, EDI/accommodation, and “don’t meet every requirement” blocks. Confirmed source-specific candidates. |
| Mississauga | 62 | Repeated alert controls and city/EDI employer overview. Clear portal/employer boilerplate. |
| Mohawk College | 8 | Repeated reconciliation/EDI, accommodation, careers-page thank-you, and analytics/site text. Clear employer/portal boilerplate. |
| Municipality of Clarington | 21 | Repeated browser warning, employer/city marketing, and EDI text. Clear portal/employer boilerplate. |
| Northumberland County | 3 | All three rows repeat cookie/privacy, accommodation, FOIP, and HR contact blocks. Clear administrative boilerplate. |
| OCAD University | 92 | Repeated cookie notice, land acknowledgement, accessibility, eligibility-priority, and thank-you text. Candidate blocks confirmed; preserve Canadian/permanent-resident eligibility wording. |
| Ontario Tech University | 10 | Repeated EDI/indigenization/decolonization, eligibility-priority, and thank-you text. Candidate employer boilerplate; preserve eligibility wording. |
| Peel Region | 39 | Repeated cookie/share/apply controls, employer EDI/about-us text, and regional marketing. Clear portal/employer boilerplate. |
| Region of Waterloo | 57 | Repeated cookie-consent, analytics, privacy, and session blocks. Portal boilerplate is confirmed; no additional source-specific employer block was needed for this pass. |
| Seneca College | 35 | Repeated employer overview, benefits/growth, and accessibility text. Clear employer boilerplate. |
| Toronto District School Board | 12 | Repeated “Working at the TDSB,” EDI/accommodation, AI-recruitment disclosure, and ERP/LRS application-administration blocks. Confirmed source-specific candidates. |
| Town of Ajax | 17 | Repeated vacancy/internal-Workday statement and equal-opportunity/equity text. Candidate administrative/employer boilerplate; preserve vacancy/status meaning if needed. |
| Town of Aurora | 11 | Repeated unsupported-browser notice and town overview/mission/employer marketing. Clear portal/employer boilerplate. |
| Town of Caledon | 41 | Repeated browser warning, town address/footer, equal-opportunity/accommodation, and diversity text. Clear portal/employer boilerplate. |
| Town of Milton | 31 | Repeated equal-opportunity/accommodation and online-application text. Clear administrative/employer boilerplate. |
| Town of Oakville | 52 | Repeated application receipt/upload instructions and AI screening disclosure. Clear application/admin boilerplate; preserve any job-specific screening or qualification content. |
| Town of Orangeville | 4 | Repeated EEO/accommodation/privacy, police-check/background-check, AI screening, and application instructions. Candidate boilerplate, but keep conditional police-check requirements when tied to the role. |
| Town of Whitby | 15 | Repeated “who we are” town/employer marketing and community overview. Candidate employer boilerplate. |
| TRCA | 13 | Repeated application instructions, thank-you/interview notice, EEO/accommodation, and screening/driver-abstract text. Candidate admin boilerplate; keep screening requirements when role-specific. |
| TTC | 59 | Repeated AI-use prohibition, hiring-process rules, and TTC mission/corporate-plan introduction. Candidate administrative/employer boilerplate; do not remove job-specific assessment requirements. |
| University of Guelph | 100 | Repeated SAP cookie-consent, session, navigation, and careers-category controls. Portal boilerplate is confirmed; no additional narrow source-wide employer rule was needed for this pass. |
| University of Ottawa | 1,684 | Repeated Workday footer and a historical/suspended COVID-19 vaccination-policy block across many postings. The footer is portal boilerplate; vaccination text is eligibility policy and must not be stripped without a product decision. |
| University of Toronto | 478 | Repeated alert/filter controls, EDI, accessibility, and accommodation blocks. Clear portal/employer boilerplate. |
| University of Waterloo | 106 | Repeated University of Waterloo employer/benefits/culture introduction across 103 of 106 rows. Candidate employer boilerplate; investigate the three exceptions before a deterministic rule. |
| Vaughan Public Library | 3 | All three rows repeat application-form fields, availability requirements, upload limits, and site navigation. Clear application/portal boilerplate; preserve availability requirements. |
| Waterfront Toronto | 1 | One posting only. It contains an organization overview, EDI/accommodation, and AI-recruitment disclaimer, but there is no cross-posting evidence. Insufficient for a source-wide rule. |
| York Region | 66 | Repeated cookie notice, online-application/interview notice, career-line instructions, contact/footer, and sharing controls. Clear portal/application boilerplate. |

## Implementation status

The read-only findings above were followed by a deterministic implementation pass. New parsed descriptions now run through the shared cleanup path. It removes recognized generic portal/social/equity boilerplate and exact duplicate bullets, plus confirmed source rules for Metrolinx, Toronto District School Board, Government of Canada, Brock University, University of Waterloo, City of Barrie, and City of St. Catharines.

Safe stored-description backfills were completed for Metrolinx, Government of Canada, University of Toronto, Town of Caledon, City of Brantford, Brock University, and City of St. Catharines. TDSB, University of Waterloo, and City of Barrie had no remaining matching stored blocks after review, so they received future-parser coverage without a database backfill. Every applied source pass was rerun until it returned zero candidates; changed records were spot-checked for retained role content and structured requirements.

The cleanup also includes a safety guard so legitimate job-title headings are not treated as empty boilerplate headings. The scraper regression suite passes 117/117 tests.

## Boundaries for the next cleanup pass

- The findings support deterministic cleanup candidates, but they do not by themselves authorize removing eligibility, compensation, location, duties, qualifications, availability, police-check, driver-abstract, vaccination, or other role-dependent text.
- The two sources without independent multi-posting evidence are CreateTO and Waterfront Toronto. EFHC also needs source-attribution review because its repeated raw shell contains employer text that may belong to a shared portal.
- City of Toronto and other unimplemented candidates remain dry-run/review only where the generic cleanup would also remove legitimate role context. The separate fresh 2% holistic database audit remains required.
