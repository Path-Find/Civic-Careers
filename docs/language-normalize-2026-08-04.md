# Language field normalization — 2026-08-04

Ran `scraper/backfill-normalize-languages.ts --apply` against Turso `job_details.language_requirements`.

Scanned: 1194 filled fields (all jobs).
Updated: 107.
Cleared to empty: 0.

## Rules applied

- Canonical tokens via `normalizeLanguageRequirements()` in `requirements.ts`
- Collapse bare `Bilingual` under more specific bilingual forms
- Drop standalone English/French when `Bilingual (English/French)` is present
- Essential supersedes plain language name
- PSC levels uppercased (`bbb/bbb` → `BBB/BBB`); `CBC level` → `CBC/CBC`
- Multi-level imperative phrases expand to one token per level
- Stable sort: Essential → plain EN/FR → other languages → Bilingual…

## Updated job IDs

| ID | Source | Title | From | To |
|---|---|---|---|---|
| `Instructor-ITAL-2Q95-Winter-D3_JR-1023961` | Brock University | Instructor ITAL 2Q95 Queer Stories in Italy and the West | `["Italian","English"]` | `["English","Italian"]` |
| `601504817` | CMHC | Bilingual Specialist, Microsoft 365 Administrator | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `601506317` | CMHC | Bilingual Manager, IT Infrastructure (PaaS) | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `601508817` | CMHC | Bilingual Manager, Release and Environment Management | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `601509817` | CMHC | Bilingual Endpoint Management & Application Deployment Specialist | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `601524317` | CMHC | Bilingual Senior Specialist, ServiceNow ITSM (Incident Management) | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `601529417` | CMHC | Bilingual Senior Specialist, Endpoint & Device Management | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `601537717` | CMHC | Bilingual Senior Specialist, Network Administrator | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `601641117` | CMHC | Bilingual Manager, Infrastructure as a Service (IaaS) | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `601683917` | CMHC | Bilingual Senior Specialist, IT Operations Monitoring & Service Insights | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `602177917` | CMHC | Bilingual Principal Advisor, Underwriting Construction Apartment Loans | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `602179017` | CMHC | Bilingual Manager, Multi-Unit Underwriting | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `602786817` | CMHC | Bilingual Multi-Unit Underwriter I | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `603286517` | CMHC | Bilingual Senior Analyst, Multi-Unit Underwriting | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `603471117` | CMHC | Bilingual Senior Officer, Operations (Homeowner Underwriting) | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `603832717` | CMHC | Bilingual Senior Officer, Operations (Loans Portfolio Administration) | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `603910517` | CMHC | Bilingual Senior Specialist, Security Applications | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `603940617` | CMHC | Bilingual Director, Communications Business Partnership | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `603960517` | CMHC | Officer, Contact Centre Services | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `604061317` | CMHC | Senior Specialist, ServiceNow ITSM (Incident Management) | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `604100517` | CMHC | Bilingual Senior Specialist, IT Performance and Planning | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `604415317` | CMHC | Bilingual Specialist, Multi-Unit Servicing and Default Management | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `604493817` | CMHC | Bilingual Specialist, Partner Management | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `604538817` | CMHC | Bilingual Manager, Platform Engineering & DevOps Practices | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `604629517` | CMHC | Bilingual Translator / Editor | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `604667417` | CMHC | Bilingual Account Representative, Client Relations - Multi-Unit | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `cornwall_81003` | City of Cornwall | Case Manager | `["Bilingual (English/French) (CBC level)"]` | `["Bilingual (English/French) (CBC/CBC)"]` |
| `596587817` | City of Toronto | Registered Nurse LTC - Bilingual French/English | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `603734717` | City of Toronto | Legal Assistant 2 (Bilingual-French) | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2145334` | Government of Canada | Border Services Officer Trainee - Developmental Program | `["Bilingual","Bilingual (BBB/BBB)"]` | `["Bilingual (BBB/BBB)"]` |
| `2369109` | Government of Canada | Lecturer, Assistant Professor, Associate Professor, Professor | `["English","Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French) (BBB/BBB)"]` |
| `2372334` | Government of Canada | Counsel | `["Bilingual (English/French)","English Essential"]` | `["English Essential","Bilingual (English/French)"]` |
| `2381426` | Government of Canada | Project Assistant (Indigenous Youth Employment Opportunity) | `["Bilingual","English"]` | `["English","Bilingual"]` |
| `2409006` | Government of Canada | Lead Electronics Technologists | `["English Essential","French Essential","Bilingual (CBC/CBC)","Bilingual (BBB/BBB)"]` | `["English Essential","French Essential","Bilingual (BBB/BBB)","Bilingual (CBC/CBC)"]` |
| `2409877` | Government of Canada | Correctional Officer I | `["Bilingual (English/French)","English","French"]` | `["Bilingual (English/French)"]` |
| `2415935` | Government of Canada | Clinical Social Worker | `["Bilingual imperative CCC/CCC, CBC/CBC, or BBB/BBB"]` | `["Bilingual (BBB/BBB)","Bilingual (CBC/CBC)","Bilingual (CCC/CCC)"]` |
| `2417487` | Government of Canada | Inventory | `["English Essential","French Essential","Bilingual","Bilingual (BBB/BBB)","Bilingual (CBC/CBC)"]` | `["English Essential","French Essential","Bilingual (BBB/BBB)","Bilingual (CBC/CBC)"]` |
| `2421905` | Government of Canada | Bilingual Manager, IT Infrastructure (PaaS) | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2427385` | Government of Canada | Project Manager - Level 1 | `["Bilingual (BBB/BBB)","Bilingual"]` | `["Bilingual (BBB/BBB)"]` |
| `2429117` | Government of Canada | Audit Professional | `["Bilingual (English/French)","English"]` | `["Bilingual (English/French)"]` |
| `2429714` | Government of Canada | Employee and Labour Relations Advisor | `["Bilingual","Bilingual (CBC/CBC)"]` | `["Bilingual (CBC/CBC)"]` |
| `2430549` | Government of Canada | Bilingual Multi-Unit Underwriter I | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2430831` | Government of Canada | Grounds and Maintenance Worker | `["Bilingual","Bilingual (CBC/CBC)"]` | `["Bilingual (CBC/CBC)"]` |
| `2433107` | Government of Canada | Head, Individual Giving | `["English","French","Bilingual","Bilingual (CBC/CBC)"]` | `["English","French","Bilingual (CBC/CBC)"]` |
| `2434211` | Government of Canada | Psychologist | `["Bilingual","Bilingual (CBC/CBC)"]` | `["Bilingual (CBC/CBC)"]` |
| `2435159` | Government of Canada | Senior Manager, Physical Security | `["Bilingual","Bilingual (CBC/CBC)"]` | `["Bilingual (CBC/CBC)"]` |
| `2435854` | Government of Canada | Industrial Technology Advisor | `["Bilingual (CCC/CCC)","Bilingual"]` | `["Bilingual (CCC/CCC)"]` |
| `2435857` | Government of Canada | Senior Geodetic Engineer (Anticipatory) | `["English Essential","French Essential","Bilingual","Bilingual (BBB/BBB)","Bilingual (CBC/CBC)","Bilingual (CCC/CCC)"]` | `["English Essential","French Essential","Bilingual (BBB/BBB)","Bilingual (CBC/CBC)","Bilingual (CCC/CCC)"]` |
| `2436124` | Government of Canada | Senior Surveyor | `["Bilingual (English/French) (BBB/BBB)","English Essential"]` | `["English Essential","Bilingual (English/French) (BBB/BBB)"]` |
| `2437502` | Government of Canada | Grain Inspector Trainee | `["English Essential","Bilingual (BBB/BBB)","Bilingual"]` | `["English Essential","Bilingual (BBB/BBB)"]` |
| `2437549` | Government of Canada | Bilingual SP-03 Call Centre Agent | `["Bilingual","Bilingual (BBC/BBC)"]` | `["Bilingual (BBC/BBC)"]` |
| `2437648` | Government of Canada | Bilingual Senior Officer, Operations (Homeowner Underwriting) | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2438306` | Government of Canada | Patent Examiner in the Biotechnology Division | `["Bilingual (English/French)","English Essential"]` | `["English Essential","Bilingual (English/French)"]` |
| `2438901` | Government of Canada | Business Services Advisor | `["Bilingual (BBB/BBB)","Bilingual"]` | `["Bilingual (BBB/BBB)"]` |
| `2439289` | Government of Canada | Contract Coordinator | `["Bilingual (CBC/CBC)","Bilingual"]` | `["Bilingual (CBC/CBC)"]` |
| `2439787` | Government of Canada | Research Officer, Design, Integration and Control of Mobile Robotic Systems | `["Bilingual (BBB/BBB)","Bilingual"]` | `["Bilingual (BBB/BBB)"]` |
| `2439907` | Government of Canada | Pay and Benefits Specialist | `["Bilingual imperative BBB/BBB"]` | `["Bilingual (BBB/BBB)"]` |
| `2440049` | Government of Canada | Bilingual Senior Officer, Operations (Loans Portfolio Administration) | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2440130` | Government of Canada | Industrial Technology Advisor - Defense, Aerospace and/or Public Safety | `["Bilingual (CBC/CBC)","Bilingual"]` | `["Bilingual (CBC/CBC)"]` |
| `2441120` | Government of Canada | Collaborative Program Support Officer | `["Bilingual (BBB/BBB)","Bilingual"]` | `["Bilingual (BBB/BBB)"]` |
| `2441277` | Government of Canada | Bilingual Principal Advisor, Underwriting Construction Apartment Loans | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2441281` | Government of Canada | Bilingual Manager, Multi-Unit Underwriting | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2441287` | Government of Canada | Bilingual Senior Analyst, Multi-Unit Underwriting | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2441289` | Government of Canada | Bilingual Multi-Unit Underwriter I | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2441490` | Government of Canada | Bilingual Senior Specialist, Security Applications | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2441521` | Government of Canada | Construction Project Coordinator | `["Bilingual (BBB/BBB)","Bilingual"]` | `["Bilingual (BBB/BBB)"]` |
| `2441536` | Government of Canada | Officer, Contact Centre Services | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2441706` | Government of Canada | Veterinarian – Animal Health | `["Bilingual","Bilingual (BBB/BBB)"]` | `["Bilingual (BBB/BBB)"]` |
| `2442447` | Government of Canada | Financial Analyst | `["Bilingual (English/French) (CBC level)"]` | `["Bilingual (English/French) (CBC/CBC)"]` |
| `2442492` | Government of Canada | Bilingual Senior Specialist, IT Performance and Planning | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2442639` | Government of Canada | Program and Project Advisor, Digital Transformation | `["Bilingual (CBC/CBC)","Bilingual"]` | `["Bilingual (CBC/CBC)"]` |
| `2443032` | Government of Canada | Enumerator (Montreal) - French Required or Bilingual | `["Bilingual","French"]` | `["French","Bilingual"]` |
| `2443039` | Government of Canada | Clerk, Surveys (Montreal) - French Required or Bilingual (EN/FR) | `["Bilingual","French"]` | `["French","Bilingual"]` |
| `2443752` | Government of Canada | Chief, Flight Test | `["Bilingual","Bilingual (CBC/CBC)"]` | `["Bilingual (CBC/CBC)"]` |
| `2444104` | Government of Canada | Interactive Media Producer | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2444124` | Government of Canada | Accounting Technician | `["Bilingual (English/French) (CBC level)"]` | `["Bilingual (English/French) (CBC/CBC)"]` |
| `2444128` | Government of Canada | IT Support Technician, Level 2 - Digital Environment | `["Bilingual (English/French) (CBC level)"]` | `["Bilingual (English/French) (CBC/CBC)"]` |
| `2444148` | Government of Canada | Specialist, IT Business Analysis | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2444519` | Government of Canada | Legal Counsel | `["English Essential","Bilingual","Bilingual (CBC/CBC)"]` | `["English Essential","Bilingual (CBC/CBC)"]` |
| `2445417` | Government of Canada | Bilingual Specialist, Multi-Unit Servicing and Default Management | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2445419` | Government of Canada | Project and Planning Specialist | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2445862` | Government of Canada | Experienced Police Dispatcher | `["Bilingual","Bilingual (BBC/BBC)"]` | `["Bilingual (BBC/BBC)"]` |
| `2445986` | Government of Canada | Director, Information Technology (IT) Audit, Audit operations | `["Bilingual","Bilingual (CBC/CBC)"]` | `["Bilingual (CBC/CBC)"]` |
| `2446414` | Government of Canada | Bilingual Specialist, Partner Management | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2446601` | Government of Canada | Bilingual Manager, Platform Engineering & DevOps Practices | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `2447339` | Government of Canada | Executive Assistant to the Director General | `["Bilingual (CBC/CBC)","Bilingual"]` | `["Bilingual (CBC/CBC)"]` |
| `2447604` | Government of Canada | Bilingual Translator / Editor | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `APEUO---Automne-Fall-2026---NLT-LTA_JR37524-1` | University of Ottawa | Long-term Appointment in Healthcare Technology and Innovation | `["French","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `APTPUO---Automne-2026---PED3600-V02---STAGE-I-MILIEU-SCOL-LMENT_JR37920` | University of Ottawa | Stage I en milieu scolaire élémentaire | `["Français (enseignement)","Compétence passive en seconde langue"]` | `["French"]` |
| `APTPUO---PSY3526-A00---FALL-2026_JR32514` | University of Ottawa | PSY3526 Psychologie interculturelle | `["French","English"]` | `["English","French"]` |
| `APTPUO---Winter-2027---API5135D_JR37962` | University of Ottawa | Ethics and Moral Reasoning for Public and International Affairs | `["English (language of instruction)","Active competence in second language"]` | `["English"]` |
| `APTPUO---aut-Fall-2026---hiv-Winter-2027---MUS6914-1-2---Thmes-en-interprtation-vocale---Special-Topic-in-Vocal-Preformance_JR35712` | University of Ottawa | Thèmes en interprétation vocale / Special Topic in Vocal Performance | `["Bilingual (English/French)","French"]` | `["Bilingual (English/French)"]` |
| `Adjointe-ou-adjoint-de-direction-II_JR37176` | University of Ottawa | Adjointe ou adjoint de direction II | `["Bilingual (English/French)","Bilingual"]` | `["Bilingual (English/French)"]` |
| `Assistant-Professor-in-Health-Science-Communication_JR28238` | University of Ottawa | Assistant Professor in Health Science Communication | `["English","French","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `Assistant-Professor-in-Women-s-History_JR28184` | University of Ottawa | Assistant Professor in Women's History | `["English","French","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `CUPE---Fall-2026---TA---TMM-4911_JR37935` | University of Ottawa | Teaching Assistant - Advanced Methods in Biomedical Research - Cell Biology and Microscopy | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `Lead-Coordinator--Accreditation-and-Program-Evaluation_JR34283` | University of Ottawa | Lead Coordinator, Accreditation and Program Evaluation | `["English","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `Lead-Coordinator--Internship-Placements_JR38009` | University of Ottawa | Lead Coordinator, Internship Placements | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `Professeure-ou-Professeur----Programme-de-Common-Law-en-franais--PCLF----2-postes_JR37834` | University of Ottawa | Assistant or Associate Professor - French Common Law Program | `["French","French Essential"]` | `["French Essential"]` |
| `Professor-in-Accounting--open-rank-_JR37755-1` | University of Ottawa | Professor in Accounting | `["French","English"]` | `["English","French"]` |
| `Professor-in-Accounting-at-the-rank-of-Assistant-or-Associate_JR37760` | University of Ottawa | Professor in Accounting at the rank of Assistant or Associate | `["French","English"]` | `["English","French"]` |
| `Research-Assistant_JR37874` | University of Ottawa | Research Assistant | `["Bilingual (English/French)","French"]` | `["Bilingual (English/French)"]` |
| `Senior-Executive-Assistant-and-IT-Governance-Coordinator_JR37669` | University of Ottawa | Senior Executive Assistant and IT Governance Coordinator | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `Senior-Executive-Assistant_JR37980` | University of Ottawa | Senior Executive Assistant | `["Bilingual","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `Tier-2-Canada-Research-Chair-in-Application-AI-Innovation-in-Public-Health_JR33417` | University of Ottawa | Tier 2 Canada Research Chair in Applied AI Innovation in Public Health | `["English","French","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `Tier-2-Canada-Research-Chair-in-Experimental-Cellular-and-Systems-Biophysics_JR30878` | University of Ottawa | Tier 2 Canada Research Chair in Experimental Cellular and Systems Biophysics | `["English","French","Bilingual (English/French)"]` | `["Bilingual (English/French)"]` |
| `604136617` | University of Toronto | Assistant Professor, Teaching Stream - French Language Teaching and Cultural Studies | `["French","English"]` | `["English","French"]` |

## IDs only

```
Instructor-ITAL-2Q95-Winter-D3_JR-1023961
601504817
601506317
601508817
601509817
601524317
601529417
601537717
601641117
601683917
602177917
602179017
602786817
603286517
603471117
603832717
603910517
603940617
603960517
604061317
604100517
604415317
604493817
604538817
604629517
604667417
cornwall_81003
596587817
603734717
2145334
2369109
2372334
2381426
2409006
2409877
2415935
2417487
2421905
2427385
2429117
2429714
2430549
2430831
2433107
2434211
2435159
2435854
2435857
2436124
2437502
2437549
2437648
2438306
2438901
2439289
2439787
2439907
2440049
2440130
2441120
2441277
2441281
2441287
2441289
2441490
2441521
2441536
2441706
2442447
2442492
2442639
2443032
2443039
2443752
2444104
2444124
2444128
2444148
2444519
2445417
2445419
2445862
2445986
2446414
2446601
2447339
2447604
APEUO---Automne-Fall-2026---NLT-LTA_JR37524-1
APTPUO---Automne-2026---PED3600-V02---STAGE-I-MILIEU-SCOL-LMENT_JR37920
APTPUO---PSY3526-A00---FALL-2026_JR32514
APTPUO---Winter-2027---API5135D_JR37962
APTPUO---aut-Fall-2026---hiv-Winter-2027---MUS6914-1-2---Thmes-en-interprtation-vocale---Special-Topic-in-Vocal-Preformance_JR35712
Adjointe-ou-adjoint-de-direction-II_JR37176
Assistant-Professor-in-Health-Science-Communication_JR28238
Assistant-Professor-in-Women-s-History_JR28184
CUPE---Fall-2026---TA---TMM-4911_JR37935
Lead-Coordinator--Accreditation-and-Program-Evaluation_JR34283
Lead-Coordinator--Internship-Placements_JR38009
Professeure-ou-Professeur----Programme-de-Common-Law-en-franais--PCLF----2-postes_JR37834
Professor-in-Accounting--open-rank-_JR37755-1
Professor-in-Accounting-at-the-rank-of-Assistant-or-Associate_JR37760
Research-Assistant_JR37874
Senior-Executive-Assistant-and-IT-Governance-Coordinator_JR37669
Senior-Executive-Assistant_JR37980
Tier-2-Canada-Research-Chair-in-Application-AI-Innovation-in-Public-Health_JR33417
Tier-2-Canada-Research-Chair-in-Experimental-Cellular-and-Systems-Biophysics_JR30878
604136617
```
