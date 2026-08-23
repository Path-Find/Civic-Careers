import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractAndStripAcademicMetadata, extractRawJobTitle, extractSourceAcademicCourse, extractSourceAcademicCourseFromRaw, extractSourceAcademicTerm, extractSourceAcademicTermFromRaw, extractTitleDuration, extractUrlJobTitle, isEmploymentOrDurationParen, isUsableJobTitle, normalizeJobTitle, normalizeSourceJobTitle, normalizeSourceJobTitleFromRaw } from '../title';

describe('isEmploymentOrDurationParen', () => {
  it('matches employment and duration parentheticals', () => {
    for (const s of [
      'Part-Time',
      'Part Time',
      'Full-time',
      'Temporary',
      'Casual',
      'Seasonal',
      'Permanent',
      'Term',
      'Contract',
      'Inventory',
      'Approximately 2-year contract',
      '2 Year Contract',
      '9 Month Contract',
      '1-Year Contract',
      '18-months contract',
      '3 Year Contract',
      'fixed-term',
      'Permanent, On-Call',
      'Temporary, up to 6 months',
      'PART-TIME, TERM',
      'Regular Part-Time',
      'Fixed Term Contract',
      'On-Call',
    ]) {
      assert.equal(isEmploymentOrDurationParen(s), true, s);
    }
  });

  it('keeps meaningful parentheticals', () => {
    for (const s of [
      'Strength Training',
      'Sports',
      'Aquafit Instructor',
      'Cemeteries',
      'The Aud',
      'PhD Required –Physical Sciences or Related Discipline',
      'TES',
      'ENG1112',
      'ACCE',
    ]) {
      assert.equal(isEmploymentOrDurationParen(s), false, s);
    }
  });
});

it('extracts Defence Construction Canada titles from the syndicated layout', () => {
  assert.equal(
    extractRawJobTitle('Defence Construction Canada', 'Position Description\nAdministrative Assistant\nLocation\nSK, Moose Jaw'),
    'Administrative Assistant',
  );
});

describe('normalizeJobTitle', () => {
  it('strips employment/duration parentheticals', () => {
    assert.equal(normalizeJobTitle('Custodian (Part-Time)'), 'Custodian');
    assert.equal(
      normalizeJobTitle('Change Management Lead (Approximately 2-year contract)'),
      'Change Management Lead',
    );
    assert.equal(normalizeJobTitle('Animal Services Officer (2 Year Contract)'), 'Animal Services Officer');
    assert.equal(normalizeJobTitle('Coordinator, Commercial Management (9 Month Contract)'), 'Coordinator, Commercial Management');
    assert.equal(normalizeJobTitle('Building Inspector I (18-months contract)'), 'Building Inspector I');
    assert.equal(normalizeJobTitle('Senior IT Project Manager - IT Security & IT Risk (12 month temporary)'), 'Senior IT Project Manager - IT Security & IT Risk');
    assert.equal(normalizeJobTitle('House Technician II (Temporary, up to 6 months)'), 'House Technician II');
    assert.equal(normalizeJobTitle('Recreation Facilities Attendant I - Arenas (Permanent, On-Call)'), 'Recreation Facilities Attendant I - Arenas');
    assert.equal(normalizeJobTitle('Contract, Community Relations Specialist (18 Months)'), 'Community Relations Specialist');
    assert.equal(normalizeJobTitle('Financial Specialist (GIS) - Fixed Term Contract'), 'Financial Specialist (GIS)');
    assert.equal(normalizeJobTitle('Cleaner (On-Call)'), 'Cleaner');
    assert.equal(normalizeJobTitle('Talent Pool - Journeyed Trade, Industrial Mechanic'), 'Journeyed Trade, Industrial Mechanic');
    assert.equal(normalizeJobTitle('Personal Support Worker (Casual)'), 'Personal Support Worker');
    assert.equal(normalizeJobTitle('Building Servicer 1 - Aquatics (Seasonal)'), 'Building Servicer 1 - Aquatics');
    assert.equal(
      normalizeJobTitle('Fitness Instructor – Spin and Sculpt (Strength Training) (Part-Time)'),
      'Fitness Instructor – Spin and Sculpt (Strength Training)',
    );
  });

  it('strips inventory and trailing employment dashes', () => {
    assert.equal(normalizeJobTitle('Mason/Tile setter - Inventory'), 'Mason/Tile setter');
    assert.equal(normalizeJobTitle('Student Visitor Services Attendant - INVENTORY'), 'Student Visitor Services Attendant');
    assert.equal(normalizeJobTitle('Instructor (Sports) - Part-time'), 'Instructor (Sports)');
    assert.equal(normalizeJobTitle('Facility Attendant - Services - Part-Time'), 'Facility Attendant - Services');
    assert.equal(
      normalizeJobTitle('Gardener - 12-Month Contract with Possibility of Extension'),
      'Gardener',
    );
    assert.equal(normalizeJobTitle('Assurance Specialist, Structures - 12 Month Contract'), 'Assurance Specialist, Structures');
    assert.equal(normalizeJobTitle('Junior Planner, Development – 1 Vacancy'), 'Junior Planner, Development');
    assert.equal(normalizeJobTitle('User Service Representative (3 positions)'), 'User Service Representative');
    assert.equal(normalizeJobTitle('User Service Representative - 3 positions'), 'User Service Representative');
    assert.equal(normalizeJobTitle('Greeter / Demonstrator - (Several Positions)'), 'Greeter / Demonstrator');
    assert.equal(
      normalizeJobTitle('Field Placement Support Officer (Appendix D/Temporary Assignment: September 2026 – September 2027)'),
      'Field Placement Support Officer',
    );
    assert.equal(normalizeJobTitle('Relief School Crossing Guard (Up to 6)'), 'Relief School Crossing Guard');
    assert.equal(normalizeJobTitle('School Crossing Guard - GENERAL APPLICATION POOL'), 'School Crossing Guard');
  });

  it('moves parenthetical union markers out of the display title', () => {
    assert.equal(
      normalizeJobTitle('TA (CUPE) - SED3115 A - Fall 2026'),
      'TA - SED3115 A - Fall 2026',
    );
    assert.equal(normalizeJobTitle('Research Assistant (OPSEU 1)'), 'Research Assistant');
    assert.equal(normalizeJobTitle('Coordinator (ACCE)'), 'Coordinator (ACCE)');
  });

  it('strips Temporary+FT/PT and leading FT/PT prefixes', () => {
    assert.equal(
      normalizeJobTitle('Temporary Part-Time Dance Instructor - Fall 2026'),
      'Dance Instructor - Fall 2026',
    );
    assert.equal(normalizeJobTitle('Part-time Transit Operator'), 'Transit Operator');
    assert.equal(normalizeJobTitle('Part Time Lifeguard & Swim Instructor'), 'Lifeguard & Swim Instructor');
    assert.equal(
      normalizeJobTitle('Full-time Digital Marketing and Communications Specialist'),
      'Digital Marketing and Communications Specialist',
    );
    assert.equal(
      normalizeJobTitle('Part-Time Casual CJIIC Administrative Assistant'),
      'CJIIC Administrative Assistant',
    );
    assert.equal(normalizeJobTitle('Part Time - Food Services Worker'), 'Food Services Worker');
    assert.equal(normalizeJobTitle('Recreation Assistant - RE-POST (Periodic Posting)'), 'Recreation Assistant');
  });

  it('strips employer posting-number prefixes', () => {
    assert.equal(
      normalizeJobTitle('Job ID #32177: Senior Financial Analyst-Utility Billing'),
      'Senior Financial Analyst-Utility Billing',
    );
    assert.equal(normalizeJobTitle('JOB ID 32166: Process Supervisor'), 'Process Supervisor');
    assert.equal(normalizeJobTitle('Job Posting - Mechanic, Municipal Garage'), 'Mechanic, Municipal Garage');
  });

  it('cleans source-specific title metadata', () => {
    assert.equal(
      normalizeSourceJobTitle('City of Waterloo', 'Wastewater Operator Employment StatusRegular Full-Time'),
      'Wastewater Operator',
    );
    assert.equal(
      normalizeSourceJobTitle('Humber College', 'Clinical Education Resources Manager - FHLS - FT Admin'),
      'Clinical Education Resources Manager',
    );
    assert.equal(
      normalizeSourceJobTitle('Humber College', 'Transportation and Parking Services Coordinator - CDFM - RPT'),
      'Transportation and Parking Services Coordinator',
    );
    assert.equal(
      normalizeSourceJobTitle('Humber College', 'Nursing Lab Specialist (2 Positions) - FHLS - FT Support'),
      'Nursing Lab Specialist',
    );
    assert.equal(
      normalizeSourceJobTitle('Government of Canada', 'Manufacturing Execution System (MES) Software Specialist (#25689)'),
      'Manufacturing Execution System (MES) Software Specialist',
    );
    assert.equal(normalizeSourceJobTitle('Government of Canada', 'PM-01 Client Support Centre Agent'), 'Client Support Centre Agent');
    assert.equal(normalizeSourceJobTitle('Government of Canada', 'Team Leader - IT Business Line Advisory Services - Bilingual'), 'Team Leader - IT Business Line Advisory Services');
    assert.equal(normalizeSourceJobTitle('Government of Canada', 'Bilingual Senior Specialist, Security Applications'), 'Senior Specialist, Security Applications');
    assert.equal(
      normalizeSourceJobTitleFromRaw(
        'City of Burlington',
        'Program Staff for Adult 19+ and 55+ Programs',
        'The Adult Recreation Services Unit is currently accepting applications for the following positions: Program Leader/Instructor, RCC Specialized Program Instructor, RCC',
      ),
      'Program Leader/Instructor and Specialized Program Instructor',
    );
    assert.equal(
      normalizeSourceJobTitle('Toronto District School Board', 'TDSB Teaching - Elementary/Secondary - Occasional Teaching/Eligible to Hire'),
      'Occasional Teacher',
    );
    assert.equal(
      normalizeSourceJobTitle('University of Ottawa', 'APTPUO---Winter-2027---API5135D_JR37962---Ethics and Moral Reasoning'),
      'Ethics and Moral Reasoning',
    );
    assert.equal(
      normalizeSourceJobTitle('University of Ottawa', 'Sessional Lecturer: Winter 2027 Planning Seminar'),
      'Sessional Lecturer: Planning Seminar',
    );
    assert.equal(
      normalizeSourceJobTitle('University of Ottawa', 'Winter Operations Coordinator'),
      'Winter Operations Coordinator',
    );
    assert.equal(normalizeSourceJobTitle('York University', 'F/W 26/27 - Research Assistant'), 'Research Assistant');
    assert.equal(extractSourceAcademicTerm('York University', 'F/W 26/27 - Research Assistant'), 'Fall/Winter 2026-27');
    assert.equal(normalizeSourceJobTitle('Brock University', 'Front Counter 2 (Winter) Sessional'), 'Front Counter 2');
    assert.equal(extractSourceAcademicTerm('Brock University', 'Front Counter 2 (Winter) Sessional'), 'Winter');
    assert.equal(normalizeSourceJobTitle('University of Northern British Columbia', 'FANU03-26 - Assistant Professor (0.7 FTE), MScN Nurse Practitioner (Prince George)'), 'Assistant Professor (0.7 FTE), MScN Nurse Practitioner (Prince George)');
    assert.equal(normalizeSourceJobTitle('University of Northern British Columbia', 'FAPT21-26 Part-Time Instructor NRSG 410 Professional Practice: Mental Health and Addictions Nursing'), 'Instructor');
    assert.equal(normalizeSourceJobTitle('University of Northern British Columbia', 'FACRC01-26 - Canada Research Chair Tier 2: Indigenous Planning'), 'Canada Research Chair Tier 2: Indigenous Planning');
  });

  it('cleans Brock instructional titles and preserves their term metadata', () => {
    assert.equal(
      normalizeSourceJobTitle('Brock University', 'Marker-Grader MBAB 5P03 Fall D2'),
      'Marker-Grader',
    );
    assert.equal(extractSourceAcademicTerm('Brock University', 'Marker-Grader MBAB 5P03 Fall D2'), 'Fall');
    assert.equal(
      normalizeSourceJobTitle('University of Winnipeg', 'Teaching Assistant, BIOL-1112L (Fall 2026/Winter 2027)'),
      'Teaching Assistant, BIOL-1112L',
    );
    assert.equal(
      normalizeSourceJobTitle('University of Ottawa', 'Fall 2026 - TA - CMN3102-C00'),
      'Teaching Assistant',
    );
  });

  it('removes pool, pipeline, and multiplicity annotations from titles', () => {
    assert.equal(
      normalizeSourceJobTitle('Metrolinx', '310T Mechanic - Streetsville - Various Shifts ($44.04/hourly) - POOL'),
      '310T Mechanic',
    );
    assert.equal(normalizeJobTitle('Project Coordinator (Capital Project Delivery) - PIPELINE POSTING ONLY'), 'Project Coordinator (Capital Project Delivery)');
    assert.equal(normalizeJobTitle('Clinical Practice Nurse Clinician x 20 (RPT)'), 'Clinical Practice Nurse Clinician');
  });

  it('moves Toronto and TMU course metadata out of display titles', () => {
    assert.equal(
      normalizeSourceJobTitle('Toronto Metropolitan University', 'F26 Soc Teaching Assistant SOC490(1-4) JG 2 roles'),
      'Teaching Assistant',
    );
    assert.equal(
      extractSourceAcademicCourse('Toronto Metropolitan University', 'Academic Assistant - CPS615 - Theory of Computation'),
      'CPS615 — Theory of Computation',
    );
    assert.equal(
      normalizeSourceJobTitle('University of Toronto', 'Sessional Lecturer - STA258H5S LEC103 Statistics with Applied Probability'),
      'Sessional Lecturer',
    );
    assert.equal(
      extractSourceAcademicCourse('University of Toronto', 'Sessional Lecturer - STA258H5S LEC103 Statistics with Applied Probability'),
      'STA258H5S — Statistics with Applied Probability',
    );
    assert.equal(extractSourceAcademicTerm('Toronto Metropolitan University', 'F26 Soc Teaching Assistant SOC490(1-4) JG 2 roles'), 'Fall 2026');
    assert.equal(normalizeSourceJobTitle('Toronto Metropolitan University', 'Co Teaching Position - DG8012 MRP in Digital Media Fall 2026'), 'Co Teaching MRP in Digital Media');
    assert.equal(normalizeSourceJobTitle('University of Ottawa', 'Fall 2026 - TA ENV1101'), 'Teaching Assistant');
    assert.equal(normalizeSourceJobTitle('University of Ottawa', 'Fall 2026 BCH4932 G00'), 'Course Instructor');
    assert.equal(normalizeSourceJobTitle('University of Ottawa', 'Winter 2027- GNG2501 C'), 'Course Instructor');
    assert.equal(normalizeSourceJobTitle('York University', 'PASS Leader KINE 1031/2031 F/W (Academic Peer Support Assistant Lead)'), 'PASS Leader (Academic Peer Support Assistant Lead)');
    assert.equal(normalizeJobTitle('Volunteer Probationary Firefighter - 2027 Recruitment'), 'Volunteer Probationary Firefighter');
    assert.equal(extractSourceAcademicTerm('York University', 'PASS Leader KINE 1031/2031 F/W 26/27'), 'Fall/Winter 2026-27');
  });

  it('uses source-specific academic course formats without promoting term or section labels', () => {
    assert.equal(extractSourceAcademicCourse('Brock University', 'Marker-Grader MBAB 5P03 Fall D2'), 'MBAB 5P03');
    assert.equal(extractSourceAcademicCourse('University of Ottawa', 'Fall 2026 - ANT2521 A00'), 'ANT2521');
    assert.equal(extractSourceAcademicCourse('University of Ottawa', 'ATPUO Winter 2027 MBA5501B00 Corporate Governance'), 'MBA5501B00 — Corporate Governance');
    assert.equal(extractSourceAcademicCourse('University of Toronto', 'Sessional Lecturer - STA258H5S LEC103 Statistics'), 'STA258H5S — Statistics');
    assert.equal(extractSourceAcademicCourse('Toronto Metropolitan University', 'Academic Assistant CPS109'), 'CPS109');
    assert.equal(extractSourceAcademicCourse('York University', 'PASS Leader KINE 1031/2031 F/W'), 'KINE 1031/2031');
    assert.equal(extractSourceAcademicCourse('University of Toronto', 'Sessional Lecturer Fall2026 JR38000'), '');
    assert.equal(extractSourceAcademicCourse('University of Ottawa', 'Analyst, IT Support JR38657'), '');
    assert.equal(
      extractSourceAcademicCourseFromRaw('University of Ottawa', 'Course Title: Technologie en enseignement en santéCourse Code: MED6505Section:'),
      'MED6505 — Technologie en enseignement en santé',
    );
    assert.equal(
      extractSourceAcademicTermFromRaw('University of Ottawa', 'Academic Period:2027 Spring-Summer Semester'),
      'Spring/Summer 2027',
    );
  });

  it('cleans uOttawa slug titles with hyphenated course codes and sections', () => {
    assert.equal(
      normalizeSourceJobTitle(
        'University of Ottawa',
        'APTPUO---Fall-2026---Part-time-Professor-English-Language-Development-Instructor---ESL-0160-F300--Student-Teaching-in-English-Program--STEP-_JR38567',
      ),
      'Professor English Language Development Instructor',
    );
    assert.equal(
      normalizeSourceJobTitle('University of Ottawa', 'APTPUO-FALL-2026-CHM4139-A00_JR38344-1'),
      'Course Instructor',
    );
    assert.equal(
      normalizeSourceJobTitle('University of Ottawa', 'APTPUO---Printemps-t-2027---MED6505_JR38394'),
      'Course Instructor',
    );
  });

  it('does not strip bare Temporary proper-name prefixes', () => {
    assert.equal(
      normalizeJobTitle('Temporary Employment Services (TES), Office Assistant'),
      'Temporary Employment Services (TES), Office Assistant',
    );
    assert.equal(normalizeJobTitle('Temporary Facility Operator'), 'Temporary Facility Operator');
    assert.equal(normalizeJobTitle('Temporary Arena/Pool Operator'), 'Temporary Arena/Pool Operator');
  });

  it('keeps course codes and meaningful parens', () => {
    assert.equal(
      normalizeJobTitle('Part-time Professor - Technical Report Writing (ENG1112)'),
      'Professor - Technical Report Writing (ENG1112)',
    );
    assert.equal(
      normalizeJobTitle('Part-Time Facilitator – Liberal Studies (PhD Required –Physical Sciences or Related Discipline)'),
      'Facilitator – Liberal Studies (PhD Required –Physical Sciences or Related Discipline)',
    );
  });

  it('is stable on already-clean titles', () => {
    assert.equal(normalizeJobTitle('Change Management Lead'), 'Change Management Lead');
    assert.equal(normalizeJobTitle('Utility Student'), 'Utility Student');
    assert.equal(normalizeJobTitle(''), '');
  });

  it('extracts source terms for pending listings', () => {
    assert.equal(extractTitleDuration('House Technician II (Temporary, up to 6 months)'), 'up to 6 months');
    assert.equal(extractTitleDuration('Recreation Facilities Attendant I - Arenas (Permanent, On-Call)'), 'Permanent');
    assert.equal(extractTitleDuration('Senior Copywriter Specialist (12 months contract)'), '12 months contract');
    assert.equal(
      extractTitleDuration('Gardener - 12-Month Contract with Possibility of Extension'),
      '12-Month Contract with Possibility of Extension',
    );
  });
});

describe('isUsableJobTitle', () => {
  it('rejects portal navigation headings but keeps real roles', () => {
    assert.equal(isUsableJobTitle('Skip to Main Content'), false);
    assert.equal(isUsableJobTitle('Skip To Job Description'), false);
    assert.equal(isUsableJobTitle('Workload n (in days) to receive an alert:'), false);
    assert.equal(isUsableJobTitle('An academic strike is in effect at all Ontario Colleges, including Sheridan.'), false);
    assert.equal(isUsableJobTitle('Associate Director, Finance and Administration'), true);
  });
});

describe('extractUrlJobTitle', () => {
  it('uses a human-readable URL slug only when the capture confirms it', () => {
    assert.equal(
      extractUrlJobTitle(
        'https://cityofbelleville.applytojob.com/apply/abc/ByLaw-Enforcement-Officer',
        'By-Law Enforcement Officer Belleville, ON, Canada',
      ),
      'By Law Enforcement Officer',
    );
    assert.equal(
      extractUrlJobTitle(
        'https://careers.example.ca/psc/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL#jobid=123',
        'Skip to Main Content Search Jobs Job Description',
      ),
      '',
    );
    assert.equal(
      extractUrlJobTitle('https://careers.example.ca/jobs/12345', 'Senior Planner'),
      '',
    );
  });
});

describe('extractRawJobTitle', () => {
  it('recovers titles from affected source layouts without parsing the body', () => {
    assert.equal(
      extractRawJobTitle('Western University', 'Job TitleAdministrative Assistant V\nNext JobApply for JobJob ID44107'),
      'Administrative Assistant V',
    );
    assert.equal(
      extractRawJobTitle('Fleming College', 'Job Description\nMore Actions\nPrevious Job\nProfessor, Police Foundations\nNext Job\nApply for Job\nJob TitleProfessor, Police Foundations\nDescrAcademic Full Time'),
      'Professor, Police Foundations',
    );
    assert.equal(
      extractRawJobTitle('TransLink', 'Job Description\nMore Actions\nPrevious Job\nLead Industrial Engineer, Maintenance Improvements (Lean Six Sigma)\nNext Job\nApply for Job\nJob ID20260599'),
      'Lead Industrial Engineer, Maintenance Improvements (Lean Six Sigma)',
    );
    assert.equal(
      extractRawJobTitle('City of Calgary', 'Search JobsJob DescriptionJob TitleTechnical Documentation SpecialistNext JobJob ID315101'),
      'Technical Documentation Specialist',
    );
    assert.equal(
      extractRawJobTitle('Toronto District School Board', 'Skip to job titleSkip to action buttons\nManager, Indigenous Community Engagement (Permanent)\nApply now'),
      'Manager, Indigenous Community Engagement',
    );
    assert.equal(
      extractRawJobTitle('City of Windsor', 'Skip To Job Description\nCaretaker\nJob Title: CaretakerJob Posting Number: 2026-0264'),
      'Caretaker',
    );
    assert.equal(
      extractRawJobTitle('City of Thunder Bay', 'Back Traffic Control & Street Lighting Technician I (Full-Time)JOB_DESCRIPTION.SHARE.HTML'),
      'Traffic Control & Street Lighting Technician I',
    );
    assert.equal(
      extractRawJobTitle('City of Cornwall', 'Stay Connected\nCoordinator II, Arts & Culture (26-199)City of Cornwall 159 Pitt Street'),
      'Coordinator II, Arts & Culture',
    );
    assert.equal(
      extractRawJobTitle('Conservation Halton', 'Snow School Instructor (GE)\n\nType of Contract: Contract, Seasonal\nPosting End Date: March 6, 2027'),
      'Snow School Instructor (GE)',
    );
  });

  it('does not turn a portal shell into a fake title', () => {
    assert.equal(
      extractRawJobTitle('Toronto Metropolitan University', 'Search JobsJob DescriptionSearch Category NameSearch keywordsNo results to displayTitleTitleTitle'),
      '',
    );
  });
});

describe('extractAndStripAcademicMetadata', () => {
  it('pulls union prefix, term, and course code out of a real Brock title', () => {
    const result = extractAndStripAcademicMetadata('CUPE - Fall 2026 & Winter 2027 - MUS3903 A 1&2: Production d’opéra / Opera Production (Pianist)', 'Brock University');
    assert.equal(result.unionName, 'CUPE');
    assert.equal(result.academicTerm, 'Fall 2026 & Winter 2027');
    assert.equal(result.academicCourse, 'MUS3903');
  });

  it('pulls a course code from a Brock-style title with no union/term', () => {
    const result = extractAndStripAcademicMetadata('Teaching Assistant MBAB 5P11 Fall D', 'Brock University');
    assert.equal(result.academicCourse, 'MBAB 5P11');
    assert.equal(result.title, 'Teaching Assistant Fall D');
  });

  it('does not extract or strip a course code for a non-academic source, even if the pattern matches', () => {
    const result = extractAndStripAcademicMetadata('Facilities Technician JR38550', 'City of Toronto');
    assert.equal(result.academicCourse, null);
    assert.equal(result.title, 'Facilities Technician JR38550');
  });

  it('does not extract a course code when source is omitted', () => {
    const result = extractAndStripAcademicMetadata('Teaching Assistant MBAB 5P11 Fall D');
    assert.equal(result.academicCourse, null);
    assert.equal(result.title, 'Teaching Assistant MBAB 5P11 Fall D');
  });

  it('handles a French term (Hiver/Automne)', () => {
    assert.equal(extractAndStripAcademicMetadata('APTPUO Hiver 2027 MUS 2768 A00 : Musique et identités').academicTerm, 'Hiver 2027');
    assert.equal(extractAndStripAcademicMetadata('APTPUO - Automne 2026 - PED3120 F100 - TEACH JUNIOR DIV').academicTerm, 'Automne 2026');
  });

  it('handles a slash-combined term', () => {
    assert.equal(
      extractAndStripAcademicMetadata('Sessional Lecturer: Foresight Studio, School of Graduate Studies, Fall/Winter 2026-27').academicTerm,
      'Fall/Winter 2026-27',
    );
  });

  it('leaves an ordinary title untouched when nothing matches', () => {
    const result = extractAndStripAcademicMetadata('Recreation Programmer');
    assert.equal(result.title, 'Recreation Programmer');
    assert.equal(result.academicTerm, null);
    assert.equal(result.unionName, null);
    assert.equal(result.academicCourse, null);
  });

  it('never removes a real "either/or" slash from an ordinary non-academic title', () => {
    // A generic cleanup rule that stripped any "orphaned"-looking slash was tried and
    // reverted during a full-data validation pass — it silently deleted the "/" from
    // real titles like these, changing "either A or B" into a run-on phrase.
    assert.equal(
      extractAndStripAcademicMetadata('Assistant / Associate / Full Professor - Program Director, Nephrology', 'University of Toronto').title,
      'Assistant / Associate / Full Professor - Program Director, Nephrology',
    );
    assert.equal(
      extractAndStripAcademicMetadata('Operator Parks / Facility Operator DUAL', 'City of Hamilton').title,
      'Operator Parks / Facility Operator DUAL',
    );
    assert.equal(
      extractAndStripAcademicMetadata('SUPERINTENDENT PS PLANNING (COMMUNITY/ PUBLIC OUTREACH & EDUCATION)', 'City of Toronto').title,
      'SUPERINTENDENT PS PLANNING (COMMUNITY/ PUBLIC OUTREACH & EDUCATION)',
    );
  });

  it('cleans up a comma/colon left dangling after a course-code strip', () => {
    assert.equal(
      extractAndStripAcademicMetadata('Teaching Assistant, CMN2568 - Mondialisation et communication', 'University of Ottawa').title,
      'Teaching Assistant, Mondialisation et communication',
    );
    assert.equal(
      extractAndStripAcademicMetadata('Sessional Lecturer - RLG373H1F: Buddhist Ritual', 'University of Toronto').title,
      'Sessional Lecturer - Buddhist Ritual',
    );
  });
});
