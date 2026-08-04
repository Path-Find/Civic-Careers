import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractCertificationRequirements,
  extractEducationRequirements,
  extractExperienceRequirements,
  extractLanguageRequirements,
  extractLanguageVehicleRequirements,
  extractLicenseRequirements,
  extractNamedBenefits,
  extractListingType,
  extractSoftwareRequirements,
  extractVehicleRequired,
  hasLanguageVehicleCandidate,
  normalizeLanguageRequirements,
  normalizeVehicleRequired,
  reconcileStructuredRequirements,
  isLanguageProficiencySkill,
  splitLanguageOutOfSkills,
} from '../requirements';

test('extracts required first aid and CPR certification without optional assets', () => {
  assert.deepEqual(extractCertificationRequirements(`## Qualifications
- Hold a current Intermediate First Aid CPR C

## Nice to Have
- WHMIS is an asset
`), ['Intermediate First Aid CPR C']);
});

test('extracts named software and ignores ambiguous categories', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Proficient in Microsoft Office Suite, Adobe Acrobat, and HEC-RAS
- Experience with engineering design software
- Word Embeddings
`);
  assert.deepEqual(result.values, ['Microsoft Office', 'Adobe Acrobat', 'HEC-RAS']);
});

test('skips optional software requirements', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Proficient in Excel
- Familiarity with Tableau is an asset

## Nice to Have
- Experience with ArcGIS
`);
  assert.deepEqual(result.values, ['Excel']);
  assert.equal(result.skippedOptionalLines, 1);
});

test('recognizes individual Microsoft programs', () => {
  const result = extractSoftwareRequirements(`## Skills
- Microsoft Word, Microsoft Excel, MS PowerPoint, Outlook, and Access
`);
  assert.deepEqual(result.values, ['Word', 'Excel', 'PowerPoint', 'Outlook', 'Access']);
});

test('recognizes a program name at the end of a sentence', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Proficient in Microsoft Word.
`);
  assert.deepEqual(result.values, ['Word']);
});

test('recognizes named web technologies in required qualifications', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Candidate has experience with web-app programming -- HTML, CSS, JavaScript and TypeScript.
`);
  assert.deepEqual(result.values, ['JavaScript', 'HTML', 'CSS', 'TypeScript']);
});

test('extracts required education and drops optional degrees from the same line', () => {
  assert.deepEqual(extractEducationRequirements(`## Qualifications
- Bachelor's degree in Corporate Communications, Media Relations, Public Relations, or related field (Master's preferred)
`), ["Bachelor's degree in Corporate Communications, Media Relations, Public Relations, or related field"]);
});

test('keeps education extraction from absorbing unrelated qualification sentences', () => {
  assert.deepEqual(extractEducationRequirements(`## Qualifications
A PhD degree (completed, in progress, near-completion, or equivalent experience) in a relevant discipline. A demonstrated interest in accessible and equitable AI. Candidate has experience with web-app programming -- HTML, CSS, JavaScript and TypeScript.
`), ['A PhD degree (completed, in progress, near-completion, or equivalent experience) in a relevant discipline']);
  assert.deepEqual(extractEducationRequirements(`## Qualifications
Your application must clearly explain how you meet the followingEducation:- A Bachelor of Law degree (i.e. Bachelor of Law (LL.B), Juris Doctor (J.D.), LL.L, or equivalent).Learn more about degree equivalency.Applied / assessed at a later dateCompetencies:- Judgement
`), ['A Bachelor of Law degree (i.e. Bachelor of Law (LL.B), Juris Doctor (J.D.), LL.L, or equivalent)']);
});

test('keeps student enrolment and co-op conditions as education requirements', () => {
  assert.deepEqual(extractEducationRequirements(`## Qualifications
- Current enrolment as a full-time student at an accredited post-secondary institution
- Registration in a co-op program
`), [
    'Current enrolment as a full-time student at an accredited post-secondary institution',
    'Registration in a co-op program',
  ]);
});

test('does not treat optional education or Master Electrician as required education', () => {
  assert.deepEqual(extractEducationRequirements(`## Qualifications
- Master's degree is preferred
- Master Electrician certification is required
- Experience dealing with clients in a post-secondary or corporate setting
- Demonstrated accuracy and attention to detail with a high degree of care

## Nice to Have
- Bachelor's degree in a related field
`), []);
});

test('does not capture incidental post-secondary wording from a long overview', () => {
  assert.deepEqual(extractEducationRequirements(`This role supports students navigating post-secondary education and coordinates campus events. The successful candidate will provide administrative support and work with faculty and learners throughout the year.`), []);
  assert.deepEqual(extractEducationRequirements(`## Qualifications
- Familiarity with provincial legislation regarding post-secondary education facilities
- Completion of a post-secondary program in a related field
`), ['Completion of a post-secondary program in a related field']);
});

test('separates education and licence clauses from a combined requirement', () => {
  const description = `## Qualifications
- University degree in engineering and registration or eligibility for registration as a Professional Engineer in Ontario
- Licensed AME or DND AVN QL6A qualifications is required. A Bachelor's Degree or an Advanced Diploma in a related field of study will be considered
`;
  assert.deepEqual(extractEducationRequirements(description), [
    'University degree in engineering',
    "Bachelor's Degree or an Advanced Diploma in a related field of study will be considered",
  ]);
  assert.deepEqual(extractLicenseRequirements(description), [
    'registration as a Professional Engineer in Ontario',
  ]);
});

test('does not treat student registration as a professional licence', () => {
  assert.deepEqual(extractLicenseRequirements('Registration as a full-time student in a post-secondary accredited academic institution is required.'), []);
});

test('extracts required years of experience and ignores optional experience', () => {
  assert.deepEqual(extractExperienceRequirements(`## Qualifications
- Minimum of 3 years of experience in case management, social services, or community support.
- Five years' experience leading teams.

## Nice to Have
- Two years of municipal experience is an asset.
`), [
    'Minimum of 3 years of experience in case management, social services, or community support',
    "Five years' experience leading teams",
  ]);
});

test('drops obvious stale overview and software-licence values during reconciliation', () => {
  const result = reconcileStructuredRequirements('## Overview\nA college is a post-secondary institution offering programs.\n\n## Qualifications\n- Must possess a valid Class G driver\'s licence', {
    education_requirements: ['A college is a leading post-secondary institution offering programs.'],
    license_requirements: ['Track software license information for compliance', 'registered as a full-time student'],
    benefits: [],
    required_skills: [],
  });
  assert.deepEqual(result.education_requirements, []);
  assert.deepEqual(result.license_requirements, ["Must possess a valid Class G driver's licence"]);
});

test('extracts required licences and excludes optional licences', () => {
  assert.deepEqual(extractLicenseRequirements(`## Qualifications
- Valid Class 'G' Ontario Driver's License with no more than six demerit points
- Registered Professional Engineer in Ontario

## Nice to Have
- A DZ licence is an asset
`), [
    "Valid Class 'G' Ontario Driver's License with no more than six demerit points",
    'Registered Professional Engineer in Ontario',
  ]);
});

test('keeps travel and overtime out of a driver licence requirement', () => {
  assert.deepEqual(extractLicenseRequirements(`## Qualifications
Possession of a valid driver’s licence that authorizes the holder to independently operate a passenger-class vehicle.- Travel: sometimes on short notice.- Overtime: including evenings and weekends.
`), ["valid driver’s licence that authorizes the holder to independently operate a passenger-class vehicle"]);
});

test('does not turn licence mentions in duties into licence requirements', () => {
  assert.deepEqual(extractLicenseRequirements(`## Qualifications
- Maintain accountability for care within the scope of training and licensure
- Work under the direction of a Registered Nurse
- Review plan registration and project documentation
`), []);
});

test('moves named benefits out of skills only when the source puts them in benefits', () => {
  const result = reconcileStructuredRequirements(`## Qualifications
- Bachelor's degree in communications
- Valid Class G driver's licence

## Compensation & Benefits
- Defined benefit pension plan (OMERS)
`, {
    education_requirements: [],
    license_requirements: [],
    benefits: ['pension'],
    required_skills: ['OMERS', "Class G driver's licence", 'Microsoft Office'],
  });
  assert.deepEqual(result.education_requirements, ["Bachelor's degree in communications"]);
  assert.deepEqual(result.license_requirements, ["Valid Class G driver's licence"]);
  assert.deepEqual(result.benefits, ['pension', 'OMERS']);
  assert.deepEqual(result.required_skills, ['Microsoft Office']);
  assert.deepEqual(extractNamedBenefits('## Qualifications\n- Administer OMERS pension plans\n'), []);
});

test('keeps OMERS as a skill when the qualifications require OMERS knowledge', () => {
  const result = reconcileStructuredRequirements(`## Qualifications
- Knowledge of OMERS pension administration

## Compensation & Benefits
- OMERS pension plan
`, {
    benefits: [],
    required_skills: ['OMERS'],
  });
  assert.deepEqual(result.required_skills, ['OMERS']);
  assert.deepEqual(result.benefits, ['OMERS']);
});

test('classifies recruitment programs separately from regular postings', () => {
  assert.equal(extractListingType('The House of Commons hires students throughout the year for diverse opportunities.', 'Student Employment Program'), 'ongoing_recruitment');
  assert.equal(extractListingType('We are hiring experienced dispatchers for our police dispatch program.', 'Experienced 9-1-1 Police Dispatcher'), 'ongoing_recruitment');
  assert.equal(extractListingType('The City accepts applications for this position throughout the year and hires on an as-needed basis.', 'Crossing Guard'), 'ongoing_recruitment');
  assert.equal(extractListingType('This posting is intended to create a candidate pool for future vacancies.', 'Driver'), 'ongoing_recruitment');
  assert.equal(extractListingType('We are recruiting 9-1-1 Police Dispatchers in British Columbia.', '9-1-1 Police Dispatchers'), 'ongoing_recruitment');
  assert.equal(extractListingType('We are hiring experienced 9-1-1 Police Dispatchers for the program.', 'Experienced Dispatcher'), 'ongoing_recruitment');
  assert.equal(extractListingType('The House of Commons offers 16-week co-op placements across multiple departments.', 'Co-op Students - Various Positions'), 'ongoing_recruitment');
  assert.equal(extractListingType('We are looking to fill two positions and establish a pool of qualified candidates for future opportunities.', 'Contract Coordinator'), 'ongoing_recruitment');
  assert.equal(extractListingType('The role may require requests for expression of interest and other procurement methods.', 'Corporate Buyer'), 'regular');
  assert.equal(extractListingType('Applications will be accepted until filled.', 'Project Coordinator'), 'regular');
  assert.equal(extractListingType('Apply by August 15 for this specific vacancy.', 'Program Coordinator'), 'regular');
  assert.equal(extractListingType('Any role may be considered for the candidate pool.', 'Analyst', true), 'inventory');
});

test('does not classify ordinary uses of annual or future-work language as recruitment', () => {
  assert.equal(extractListingType('Monitor the budgets throughout the year, assessing variances.', 'Budget Analyst'), 'regular');
  assert.equal(extractListingType('The town offers year-round sports and recreation activities.', 'Senior Manager, Operations'), 'regular');
  assert.equal(extractListingType('Establish a year-round process to maintain data integrity.', 'Manager, Financial Aid'), 'regular');
  assert.equal(extractListingType('Future opportunities in this area are expected to contribute to the following responsibilities.', 'Business Analyst'), 'regular');
});

test('classifies a source-labelled recruitment pool as ongoing recruitment', () => {
  assert.equal(extractListingType('Pool to be created\nYes\nTemporary: Term', 'Clerical and Administrative Positions'), 'ongoing_recruitment');
});

test('classifies an explicit future-vacancy inventory separately', () => {
  assert.equal(extractListingType('When you apply to this selection process, you are not applying for a specific job, but to an inventory for future vacancies.', 'Casual Stable Worker'), 'inventory');
});

test('does not treat generic lowercase teams as Microsoft Teams', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Experience leading internal teams
`);
  assert.deepEqual(result.values, []);
});

test('keeps Word when a line also mentions word processing', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Experience with Microsoft Office Suite (Word, Excel, PowerPoint), word processing, and Windows
`);
  assert.deepEqual(result.values, ['Microsoft Office', 'Word', 'Excel', 'PowerPoint', 'Windows']);
});

test('does not treat a named access tool as Microsoft Access', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Experience using the Police Access Tool (PAT)
- Experience using Microsoft Access
`);
  assert.deepEqual(result.values, ['Access']);
});

test('keeps explicit language requirements from a required section', () => {
  assert.deepEqual(extractLanguageRequirements(`## Qualifications
- English Essential
- Bilingual (English/French), BBB/BBB
- Excellent oral and written French proficiency
`), ['English', 'French', 'Bilingual']);
  assert.deepEqual(extractLanguageRequirements(`## Qualifications
- French
`), ['French']);
});

test('drops optional, generic, programming, and course language wording', () => {
  assert.deepEqual(extractLanguageRequirements(`## Qualifications
- Strong oral and written communication skills
- Fluency in R and/or Stata programming language
- Completed an equivalent course in English

## Nice to Have
- Bilingualism is an asset
- French is preferred
`), []);
});

test('accepts an explicit labelled language requirement outside a standard heading', () => {
  assert.deepEqual(extractLanguageRequirements('Language Requirement: Bilingual - English and French (CBC)'), ['Bilingual']);
  assert.deepEqual(extractLanguageRequirements('## Qualifications\n- Passive competence in a second language (English)'), ['English']);
});

test('extracts labelled language metadata from raw source text', () => {
  assert.deepEqual(extractLanguageRequirements('Language Requirement: English Essential'), ['English']);
  assert.deepEqual(extractLanguageRequirements('Language requirements (essential for the job)\nEnglish Essential\nFrench essential\nBilingual imperative BBB/BBB'), ['English', 'French', 'Bilingual']);
  assert.deepEqual(extractLanguageRequirements('Language of instruction: Français | French\nCompetence in second language: Passive'), ['French']);
  assert.deepEqual(extractLanguageRequirements('## Qualifications\n- Speak English fluently.'), ['English']);
  assert.deepEqual(extractLanguageRequirements('Various language requirements: English only, French only, or Bilingual competencies.'), ['English', 'French', 'Bilingual']);
});

test('does not treat posting language or language-of-work text as a requirement', () => {
  assert.deepEqual(extractLanguageRequirements(`## Overview
Language of work: English, French, and bilingual jobs available.
`), []);
});

test('keeps only an explicit bilingual title signal', () => {
  assert.deepEqual(extractLanguageRequirements('## Overview\nThe role supports a diverse team.', 'Bilingual Multi-Unit Underwriter I'), ['Bilingual']);
  assert.deepEqual(extractLanguageRequirements('## Overview\nFrench literature course instructor.', 'French Language Instructor'), []);
});

test('extracts required vehicle wording from qualifications', () => {
  assert.equal(extractVehicleRequired(`## Qualifications
- Valid Class G driver's licence in good standing
`), true);
  assert.equal(extractVehicleRequired(`## Requirements
- Access to a reliable vehicle is required
`), true);
});

test('does not treat optional or conditional vehicle wording as required', () => {
  assert.equal(extractVehicleRequired(`## Nice to Have
- Valid driver's license is an asset
`), null);
  assert.equal(extractVehicleRequired(`## Qualifications
- Valid driver's license for positions requiring driving
`), null);
  assert.equal(extractVehicleRequired('Successful candidates may be required to provide a driver\'s abstract check.'), null);
  assert.equal(extractVehicleRequired('Travel between sites may be required.'), null);
});

test('returns false only for an explicit vehicle negative', () => {
  assert.equal(extractVehicleRequired('A driver license is an asset but not required.'), false);
  assert.equal(extractVehicleRequired('No vehicle is required for this position.'), false);
  assert.equal(extractVehicleRequired(`## Qualifications
- Valid Class G driver's licence required
- Some duties do not require operating a vehicle
`), true);
});

test('strips language proficiency items out of skills into languages', () => {
  assert.equal(isLanguageProficiencySkill('French language proficiency'), true);
  assert.equal(isLanguageProficiencySkill('English language proficiency'), true);
  assert.equal(isLanguageProficiencySkill('Bilingualism'), true);
  assert.equal(isLanguageProficiencySkill('English'), true);
  assert.equal(isLanguageProficiencySkill('databases'), false);
  assert.equal(isLanguageProficiencySkill('Natural Language Processing'), false);
  assert.equal(isLanguageProficiencySkill('Ph.D in English'), false);
  assert.equal(isLanguageProficiencySkill('French as a Second Language teaching'), false);
  assert.equal(isLanguageProficiencySkill('French to English translation'), false);

  assert.deepEqual(
    splitLanguageOutOfSkills([
      'databases',
      'French language proficiency',
      'English language proficiency',
      'Microsoft Office',
    ]),
    { skills: ['databases', 'Microsoft Office'], languages: ['English', 'French'] },
  );
  assert.deepEqual(
    splitLanguageOutOfSkills(['Bilingual (English/French)', 'JIRA']),
    { skills: ['JIRA'], languages: ['Bilingual'] },
  );
});

test('normalizes stored field values without changing unknown to false', () => {
  assert.deepEqual(
    normalizeLanguageRequirements(['English Essential', 'Bilingual (English/French)', 'Bilingualism is an asset']),
    ['English', 'Bilingual'],
  );
  assert.equal(normalizeVehicleRequired(true), true);
  assert.equal(normalizeVehicleRequired('false'), false);
  assert.equal(normalizeVehicleRequired('unknown'), null);
  assert.equal(normalizeVehicleRequired(undefined), null);
});

test('collapses languages to plain English / French / Bilingual / named languages', () => {
  assert.deepEqual(
    normalizeLanguageRequirements(['Bilingual', 'Bilingual (English/French)']),
    ['Bilingual'],
  );
  assert.deepEqual(
    normalizeLanguageRequirements(['English', 'French', 'Bilingual (English/French)']),
    ['English', 'French', 'Bilingual'],
  );
  assert.deepEqual(
    normalizeLanguageRequirements(['Bilingual imperative CCC/CCC, CBC/CBC, or BBB/BBB']),
    ['Bilingual'],
  );
  assert.deepEqual(
    normalizeLanguageRequirements(['Bilingual (English/French, CBC/CBC)']),
    ['Bilingual'],
  );
  assert.deepEqual(
    normalizeLanguageRequirements(['Bilingual (English/French) (BBB/BBB)']),
    ['Bilingual'],
  );
  assert.deepEqual(
    normalizeLanguageRequirements(['French Essential', 'French']),
    ['French'],
  );
  assert.deepEqual(
    normalizeLanguageRequirements(['English Essential', 'French Essential', 'Bilingual (BBB/BBB)', 'Bilingual (CBC/CBC)']),
    ['English', 'French', 'Bilingual'],
  );
  assert.deepEqual(
    normalizeLanguageRequirements(['English (language of instruction)', 'Active competence in second language']),
    ['English'],
  );
  assert.deepEqual(
    normalizeLanguageRequirements(['Français (enseignement)', 'Compétence passive en seconde langue']),
    ['French'],
  );
  // Inventory-style menu: English only, French only, or bilingual — keep all three.
  assert.deepEqual(
    normalizeLanguageRequirements(['English', 'French', 'Bilingual']),
    ['English', 'French', 'Bilingual'],
  );
});

test('extracts both fields together without requiring an AI call', () => {
  assert.deepEqual(extractLanguageVehicleRequirements(`## Qualifications
- Bilingual (English/French) required
- Valid driver's licence required
`), {
    language_requirements: ['Bilingual'],
    vehicle_required: true,
  });
});

test('finds candidate descriptions without deciding that wording is a requirement', () => {
  assert.equal(hasLanguageVehicleCandidate('Bilingual (English/French) is required.'), true);
  assert.equal(hasLanguageVehicleCandidate("A valid Class G driver's licence is required."), true);
  assert.equal(hasLanguageVehicleCandidate('Strong oral and written communication skills.'), false);
  assert.equal(hasLanguageVehicleCandidate('Experience with Python programming language.'), false);
});
