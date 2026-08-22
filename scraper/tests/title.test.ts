import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractAndStripAcademicMetadata, extractRawJobTitle, extractTitleDuration, extractUrlJobTitle, isEmploymentOrDurationParen, isUsableJobTitle, normalizeJobTitle, normalizeSourceJobTitle } from '../title';

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
