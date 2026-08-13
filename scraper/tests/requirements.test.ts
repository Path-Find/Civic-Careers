import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractCertificationRequirements,
  extractEducationRequirements,
  extractExperienceRequirements,
  extractExperienceRequirementsFromSources,
  appendExperienceQualificationBullets,
  extractConcreteQualificationSkills,
  mergeConcreteQualificationSkills,
  normalizeExperienceRequirement,
  isTruncatedExperienceRequirement,
  normalizeCertificationRequirements,
  extractLanguageRequirements,
  normalizeEducationRequirements,
  extractLanguageVehicleRequirements,
  extractLicenseRequirements,
  extractProfessionalLicenseRequirements,
  normalizeLicenseRequirements,
  normalizeProfessionalLicenseRequirements,
  licensesImplyVehicle,
  extractNamedBenefits,
  stripLicenseBulletsFromDescription,
  stripStructuredQualBullets,
  extractListingType,
  normalizeListingType,
  extractSoftwareRequirements,
  extractVehicleRequired,
  hasLanguageVehicleCandidate,
  normalizeLanguageRequirements,
  normalizeVehicleRequired,
  normalizeSecurityCheckRequired,
  requirementFlagToDb,
  reconcileStructuredRequirements,
  isLanguageProficiencySkill,
  splitLanguageOutOfSkills,
} from '../requirements';

test('extracts required first aid and CPR certification without optional assets', () => {
  assert.deepEqual(extractCertificationRequirements(`## Qualifications
- Hold a current Intermediate First Aid CPR C

## Nice to Have
- WHMIS is an asset
`), ['Intermediate First Aid with CPR-C']);
});

test('normalizes certification wording without collapsing meaningful distinctions', () => {
  assert.deepEqual(normalizeCertificationRequirements([
    'First Aid',
    'First Aid with CPR-C',
    'Current Standard First Aid, CPR "C" and AED certification.',
    'Current certifications in Standard First Aid OR Intermediate First Aid with CPR C and AED.',
    'AED certification within 3 months of hire',
    'Standard First Aid OR Intermediate First Aid with CPR C or AED',
    'Food Handlers certification',
    'WHMIS training',
    'HIGH FIVE Certificate.',
    'Food Safety Certification course (Food Handlers Training) or willingness to complete within 30 days of hire',
    'Supervisor Health and Safety Awareness Training Certificate from the Ministry of Labour (may be obtained post offer)',
  ]), [
    'First Aid',
    'First Aid with CPR-C',
    'Standard First Aid with CPR-C/AED',
    'Standard or Intermediate First Aid with CPR-C/AED',
    'AED',
    'Standard or Intermediate First Aid with CPR-C or AED',
    'Food Handler',
    'WHMIS',
    'HIGH FIVE Certificate',
    'Supervisor Health and Safety Awareness training',
  ]);
});

test('removes clearly misclassified certification values', () => {
  assert.deepEqual(normalizeCertificationRequirements([
    'Vulnerable Sector Police Check',
    'CSA approved safety footwear',
    'Mandatory legislated training',
    'Active member of a professional governing body',
    'PMP certification is considered an asset',
    'Certification in Asset Management is required',
    'Proof of immunity for Hepatitis B',
    'WHMIS',
  ]), ['Certification in Asset Management is required', 'WHMIS']);
});

test('does not reduce branded or alternative credentials to generic First Aid', () => {
  assert.deepEqual(normalizeCertificationRequirements([
    "Completion of St. John's Ambulance First Aid 1 within three months",
    'Mental Health First Aid and/or Psychological First Aid training',
    'Current CPR or Basic Cardiac Life Support certification',
  ]), [
    "Completion of St. John's Ambulance First Aid 1 within three months",
    'Mental Health First Aid and/or Psychological First Aid training',
    'Current CPR or Basic Cardiac Life Support certification',
  ]);
});

test('strips certification restatements but preserves extra facts in mixed bullets', () => {
  const description = `## Qualifications
- Current Ontario Smart Serve certification
- Current Standard First Aid with CPR-C and HIGH FIVE Certificate
- Monitor guests and follow Smart Serve guidelines
- WHMIS certification
`;
  const result = stripStructuredQualBullets(description, {
    certifications: ['Smart Serve', 'Standard First Aid with CPR-C', 'WHMIS'],
  });
  assert.match(result, /HIGH FIVE Certificate/);
  assert.match(result, /Monitor guests/);
  assert.doesNotMatch(result, /Current Ontario Smart Serve certification/);
  assert.doesNotMatch(result, /WHMIS certification/);
});

test('strips pure skill restatements but preserves mixed qualification bullets', () => {
  const description = `## Qualifications
- Proficiency with Excel and GIS
- Experience with Excel and GIS in municipal reporting
- Strong communication skills
`;
  const result = stripStructuredQualBullets(description, {
    requiredSkills: ['Excel', 'GIS'],
  });
  assert.doesNotMatch(result, /Proficiency with Excel and GIS/);
  assert.match(result, /Experience with office software and GIS software in municipal reporting/);
  assert.match(result, /Strong communication skills/);
});

test('removes structured tools from qualification restatements and keeps context', () => {
  const result = stripStructuredQualBullets(`## Qualifications
- 3+ years — IT support
- Working knowledge of Windows 10/11 and Microsoft 365 applications.
- Experience with ITSM processes and tools (e.g., ServiceNow).
- Experience with SQL and statistical tools.
- Experience using software (e.g., ENVI, Pix4D, ArcGIS, or QGIS) for analysis.`, {
    experience: ['3+ years'],
    requiredSkills: ['ServiceNow'],
    software: ['Windows', 'Microsoft 365', 'SQL', 'ENVI', 'Pix4D', 'ArcGIS', 'QGIS'],
  });
  assert.match(result, /- IT support/);
  assert.doesNotMatch(result, /Windows|Microsoft 365|ENVI|Pix4D|ArcGIS|QGIS|ServiceNow/);
  assert.match(result, /Experience with ITSM processes and tools\./);
  assert.match(result, /Experience with database software and statistical tools\./);
  assert.match(result, /Experience using software for analysis\./);
});

test('removes shorter duplicate qualification bullets after preserving richer context', () => {
  const result = stripStructuredQualBullets(`## Qualifications
- Advanced analytics, market research, or customer insights, with demonstrated impact on business strategy
- Experience with strong experience with SQL and statistical tools
- advanced analytics, market research, or customer insights
 - Strong experience with SQL and statistical tools.`, { requiredSkills: ['Unrelated'] });
  assert.match(result, /demonstrated impact on business strategy/);
  assert.doesNotMatch(result, /- advanced analytics, market research, or customer insights\n/);
  assert.doesNotMatch(result, /- Strong experience with SQL and statistical tools\./);
});

test('strips pure structured restatements from every body section when requested', () => {
  const result = stripStructuredQualBullets(`## Responsibilities
- Use software (e.g., Windows and Microsoft 365 applications).

## Qualifications
- Bilingual communication skills.

## Nice to Have
- Experience with ServiceNow.`, {
    languages: ['Bilingual'],
    requiredSkills: ['ServiceNow'],
    software: ['Windows', 'Microsoft 365'],
    allSections: true,
  });
  assert.doesNotMatch(result, /Windows|Microsoft 365|Bilingual|ServiceNow/);
});

test('strips common security-screening restatements when the security flag is set', () => {
  const result = stripStructuredQualBullets(`## Qualifications
- Enhanced Security Screening required
- Criminal Record Check (CRC) required
- Experience supporting court operations`, {
    securityRequired: true,
  });
  assert.match(result, /Experience supporting court operations/);
  assert.doesNotMatch(result, /Security Screening|Criminal Record Check/);
});

test('structured restatement cleanup is idempotent after headings are exposed', () => {
  const description = `## Qualifications
- A doctoral degree (PhD) within the last three years in a field of natural sciences
- In instances where the PhD was not in natural sciences, an acceptable combination of a Bachelor's or Master's degree in a scientific field, coupled with acceptable research, training and experience.
- If currently enrolled in a doctoral program, you may apply but must complete the degree to be appointed.

**Experience:**
- Experience in planning and conducting research
- Experience in working with a team of researchers and support staff

**Ability:**
- Productivity/Recognition: recognized achievement in authorship, editorship, patents, etc.`;
  const fields = {
    education: [
      'Doctoral degree (PhD) within the last three years in a field of natural sciences',
      'In instances where the PhD was not in natural sciences',
      'If currently enrolled in a doctoral program, you may apply but must complete the degree to be appointed',
    ],
    languages: ['Bilingual'],
    allSections: true,
  };
  const once = stripStructuredQualBullets(description, fields);
  assert.equal(stripStructuredQualBullets(once, fields), once);
});

test('extracts Grade 12 as high school diploma and strips first-aid / grade-12 restatements', () => {
  const desc = `## Qualifications
- Grade 12 or equivalent
- Current Standard First Aid with CPR-C Certification.
- Customer service experience
`;
  assert.deepEqual(extractEducationRequirements(desc), ['High school diploma']);
  assert.deepEqual(extractCertificationRequirements(desc), ['Standard First Aid with CPR-C']);
  const stripped = stripStructuredQualBullets(desc, {
    education: ['High school diploma'],
    certifications: ['Standard First Aid with CPR-C'],
  });
  assert.match(stripped, /Customer service experience/);
  assert.doesNotMatch(stripped, /Grade 12/);
  assert.doesNotMatch(stripped, /First Aid/);
});

test('extracts degree verification as an Education condition', () => {
  const description = `## Qualifications
- Bachelor of Social Work degree
- Must produce verification of degree(s), credentials(s), or equivalencies from accredited institutions at interview
`;
  assert.deepEqual(extractEducationRequirements(description), ['Bachelor of Social Work degree', 'Education verification']);
  assert.doesNotMatch(stripStructuredQualBullets(description, {
    education: ['Bachelor of Social Work degree', 'Education verification'],
  }), /verification of degree/i);
});

test('keeps existing education when only verification is newly detected', () => {
  const result = reconcileStructuredRequirements(
    '## Qualifications\n- Provide proof of education at screening',
    { education_requirements: ['Bachelor\'s degree in Education'] },
  );
  assert.deepEqual(result.education_requirements, ["Bachelor's degree in Education", 'Education verification']);
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

test('canonicalizes named web and campus tools as software', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Intermediate MS Word, MS Excel, MS Access, Lotus Notes, Student Information System (SIS)
- Use software to update websites (e.g., Word Press/Contribute)
`);
  assert.deepEqual(result.values, ['Lotus Notes', 'SIS', 'Word', 'Excel', 'Access', 'WordPress', 'Contribute']);
});

test('extracts measurable typing requirements into Skills', () => {
  const description = `## Qualifications
- Typing 40-50 w.p.m. with accuracy
- Typing speed of 50 words per minute

## Nice to Have
- Typing 70 wpm is an asset
`;
  assert.deepEqual(extractConcreteQualificationSkills(description), ['Typing 40–50 w.p.m.', 'Typing 50 w.p.m.']);
  assert.deepEqual(
    mergeConcreteQualificationSkills(['typing 40 wpm', 'CritiCall'], '## Qualifications\n- Typing 40 w.p.m.'),
    ['CritiCall', 'Typing 40 w.p.m.'],
  );
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

test('strips Education:/classification/stream prefixes from education requirements', () => {
  assert.deepEqual(
    normalizeEducationRequirements([
      'AS-01 only:- Successful completion of a post-secondary diploma or degree in a law related field (already obtained OR obtained before appointment) or an acceptable combination of education, training, and/or experience',
    ]),
    ['Post-secondary diploma or degree in a law related field'],
  );
  assert.deepEqual(
    normalizeEducationRequirements(['*Education:** A secondary school diploma or employer-approved alternatives']),
    ['High school diploma'],
  );
  assert.deepEqual(
    normalizeEducationRequirements(['ED1: Graduation with a degree from a recognized post-secondary institution in mechanical engineering']),
    ['Degree in mechanical engineering'],
  );
  assert.deepEqual(
    normalizeEducationRequirements(['Engineers (EN-ENG-03): Graduation with a degree from a recognized post-secondary institution in civil engineering']),
    ['Degree in civil engineering'],
  );
  assert.deepEqual(
    normalizeEducationRequirements([
      'Your application must clearly explain how you meet the followingA secondary school diploma or an acceptable combination of education, training or experience**Candidates invited to an interview will be required to bring proof of their education credentials',
    ]),
    ['High school diploma'],
  );
  assert.deepEqual(
    normalizeEducationRequirements([
      'Completion of a high school diploma – or a combination of education, training and experience deemed equivalent',
    ]),
    ['High school diploma'],
  );
});

test('preserves partial high-school education', () => {
  assert.deepEqual(normalizeEducationRequirements(['Partial high school']), ['Partial high school']);
  const normalized = normalizeEducationRequirements(["Bachelor's degree in Business Administration; or"]);
  assert.deepEqual(normalizeEducationRequirements(normalized), normalized);
});

test('keeps education extraction from absorbing unrelated qualification sentences', () => {
  assert.deepEqual(extractEducationRequirements(`## Qualifications
A PhD degree (completed, in progress, near-completion, or equivalent experience) in a relevant discipline. A demonstrated interest in accessible and equitable AI. Candidate has experience with web-app programming -- HTML, CSS, JavaScript and TypeScript.
`), ['PhD (completed, in progress, near-completion, or equivalent experience) in a relevant discipline']);
  // keep as-is if already correct; compact must not truncate mid-parenthesis
  assert.deepEqual(extractEducationRequirements(`## Qualifications
Your application must clearly explain how you meet the followingEducation:- A Bachelor of Law degree (i.e. Bachelor of Law (LL.B), Juris Doctor (J.D.), LL.L, or equivalent).Learn more about degree equivalency.Applied / assessed at a later dateCompetencies:- Judgement
`), ['Bachelor of Law degree (i.e. Bachelor of Law (LL.B), Juris Doctor (J.D.), LL.L, or equivalent)']);
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
`), ['Post-secondary program in a related field']);
});

test('separates education and licence clauses from a combined requirement', () => {
  const description = `## Qualifications
- University degree in engineering and registration or eligibility for registration as a Professional Engineer in Ontario
- Licensed AME or DND AVN QL6A qualifications is required. A Bachelor's Degree or an Advanced Diploma in a related field of study will be considered
`;
  assert.deepEqual(extractEducationRequirements(description), [
    'University degree in engineering',
    "Bachelor's degree or college diploma in a related field",
  ]);
  assert.deepEqual(extractLicenseRequirements(description), [
    'P.Eng. (Ontario)',
  ]);
});

test('compacts wordy professional registration licences', () => {
  assert.deepEqual(
    extractLicenseRequirements(`## Qualifications
- Current registration as Registered Nurse (RN) with the College of Nurses of Ontario is required
`),
    ['RN (CNO)'],
  );
  assert.deepEqual(
    extractLicenseRequirements(`## Qualifications
- Registration with the College of Nurses of Ontario
`),
    ['CNO'],
  );
  assert.deepEqual(
    extractLicenseRequirements(`## Qualifications
- Registered as a Professional Engineer (P.Eng.) with Professional Engineers Ontario
`),
    ['P.Eng. (PEO)'],
  );
  assert.deepEqual(
    extractLicenseRequirements(`## Qualifications
- registration as a registered nurse in a province or territory of Canada
`),
    ['RN (Canada)'],
  );
});

test('compacts wordy driver licence requirements', () => {
  assert.deepEqual(
    extractLicenseRequirements(`## Qualifications
- Must have a valid Ontario Class “G” driver’s licence and meet the corporate standard for a good driving record
- Must have the ability to obtain and maintain Ontario Class “C” driver’s licence and “Z” endorsement
`),
    ['Ontario Class G', 'Ontario Class C with Z endorsement (able to obtain)'],
  );
  // Single field with both Must-clauses joined by comma (how some rows were stored).
  assert.deepEqual(
    normalizeLicenseRequirements([
      'Must have a valid Ontario Class “G” driver’s licence and meet the corporate standard for a good driving record, Must have the ability to obtain and maintain Ontario Class “C” driver’s licence and “Z” endorsement',
    ]),
    ['Ontario Class G', 'Ontario Class C with Z endorsement (able to obtain)'],
  );
  assert.deepEqual(
    extractLicenseRequirements(`## Qualifications
- Valid Ontario Class G Driver's Licence with clean driving record
`),
    ['Ontario Class G'],
  );
  assert.deepEqual(
    extractLicenseRequirements(`## Qualifications
- Must possess a Class "D" Licence with a "Z" endorsement and an abstract clear of demerit points
`),
    ['Class DZ'],
  );
  assert.deepEqual(
    normalizeLicenseRequirements(["Valid G Drivers' license and access to a reliable vehicle for campus and team travel"]),
    ['Class G'],
  );
});

test('keeps driver licences under Vehicle, not Licences', () => {
  const description = '## Qualifications\n- P.Eng. in Ontario or eligible\n- Must have a valid Ontario Class "G" driver\'s licence\n';
  assert.deepEqual(extractLicenseRequirements(description), ['P.Eng. (Ontario) or eligible', 'Ontario Class G']);
  assert.deepEqual(extractProfessionalLicenseRequirements(description), ['P.Eng. (Ontario) or eligible']);
  assert.deepEqual(normalizeProfessionalLicenseRequirements(['P.Eng. (Ontario)', 'Ontario Class G']), ['P.Eng. (Ontario)']);

  const reconciled = reconcileStructuredRequirements(description, { license_requirements: ['P.Eng. (Ontario)', 'Ontario Class G'] });
  assert.deepEqual(reconciled.license_requirements, ['P.Eng. (Ontario) or eligible']);
  assert.doesNotMatch(stripStructuredQualBullets(description, {
    licenses: reconciled.license_requirements,
    vehicleRequired: true,
  }), /Class "G"/i);
});

test('does not treat student registration as a professional licence', () => {
  assert.deepEqual(extractLicenseRequirements('Registration as a full-time student in a post-secondary accredited academic institution is required.'), []);
});

test('extracts quoted class driver licences and skips nice-to-have licences', () => {
  assert.deepEqual(extractLicenseRequirements(`## Qualifications
- Must have valid class “C” driver’s license to operate a trolley. Previous demonstrated experience as a bus driver is an asset.
`), ['Class C']);
  assert.deepEqual(extractLicenseRequirements(`## Qualifications
- College diploma

## Nice to Have
- Valid G driver's license
`), []);
  assert.deepEqual(extractLicenseRequirements(`## Qualifications
- Holder of a Canadian Public Accounting License
`), ['Holder of a Canadian Public Accounting License']);
});

test('extracts driver licences from conditions-of-employment walls', () => {
  const licenses = extractLicenseRequirements(`Conditions of employment
COE3: Must possess and maintain a valid, non-graduated, and unrestricted provincial or territorial Class 5 driver's license.
COE4: Current and acceptable driver’s abstract
`);
  assert.ok(licenses.some(value => /class\s*5/i.test(value)));
  assert.deepEqual(licenses.filter(v => /class\s*5/i.test(v)), ['Class 5']);
});

test('strips qualification bullets that restate structured licences', () => {
  const description = `## Qualifications
- University degree
- Valid Ontario Class G Driver’s License in good standing
- Three years of experience

## Responsibilities
- Drive between sites
`;
  assert.equal(
    stripLicenseBulletsFromDescription(description, ['Valid Ontario Class G Driver’s License in good standing']),
    `## Qualifications
- University degree
- Three years of experience

## Responsibilities
- Drive between sites`,
  );

  assert.equal(
    stripStructuredQualBullets(
      `## Qualifications
- High school (Grade 12) graduation, plus Law and Security program
- Over two months and up to 6 months of related experience
- Valid Class G driver's licence
- Strong communication skills

## Responsibilities
- Enforce by-laws
`,
      {
        education: ['High school diploma plus program in Law and Security, Police Foundations'],
        experience: ['Over two months and up to 6 months of related experience'],
        licenses: ['Class G'],
      },
    ),
    `## Qualifications
- Strong communication skills

## Responsibilities
- Enforce by-laws`,
  );

  // Language / Experience / Education already in structured fields (federal CRO-style).
  assert.equal(
    stripStructuredQualBullets(
      `## Qualifications
- Willingness and ability to work overtime, as required
- Competencies: effective interpersonal relationships; judgment
- Abilities: analyze complex information and develop clear recommendations; communicate orally
- Language requirements: Various language requirements - Bilingual Imperative CCC/CCC; English Essential

## Nice to Have
- Education: A professional law degree (LL.B., J.D., B.C.L.) or equivalent
`,
      {
        education: ['Degree from a post-secondary institution with an acceptable specialization in a field related to the duties of the position'],
        experience: [
          '2+ years',
          'Analyzing complex information to present recommendations or render a decision or conclusion',
        ],
        languages: ['Bilingual'],
      },
    ),
    `## Qualifications
- Willingness and ability to work overtime, as required
- Competencies: effective interpersonal relationships; judgment
- Abilities: communicate orally

## Nice to Have
- Education: A professional law degree (LL.B., J.D., B.C.L.) or equivalent`,
  );

  // Bold/non-markdown headings used by some municipal parsers.
  assert.equal(
    stripLicenseBulletsFromDescription(
      `**Qualifications/Skills:**
- College diploma
- Valid Ontario Class G Driver’s License in good standing.
- Strong knowledge of standards.
`,
      ['Valid Ontario Class G Driver’s License in good standing'],
    ),
    `**Qualifications/Skills:**
- College diploma
- Strong knowledge of standards.`,
  );
});

test('extracts required years of experience and ignores optional experience', () => {
  assert.deepEqual(extractExperienceRequirements(`## Qualifications
- Minimum of 3 years of experience in case management, social services, or community support.
- Five years' experience leading teams.

## Nice to Have
- Two years of municipal experience is an asset.
`), [
    '3+ years',
    '5 years',
  ]);
});

test('compacts federal Experience: walls and definition-of-experience meta lines', () => {
  assert.deepEqual(extractExperienceRequirements(`## Qualifications
- Experience: analyzing complex information to present recommendations or render a decision or conclusion
- Experience: drafting formal reports, briefing notes, or decisions
- Experience: in the interpretation, application or development of legislation or regulations
- Experience is defined as experience acquired over a period of approximately two (2) years or more performing the duties on a regular basis
`), [
    '2+ years',
  ]);
});

test('extracts month-based experience and high-school education without splitting Grade 12', () => {
  const description = `## Qualifications
- High school (Grade 12) graduation, plus an additional program of over one and up to two years in Law and Security, Police Foundations or equivalent
- Over two months and up to 6 months of related experience
- Valid non-probationary class G license
`;
  assert.deepEqual(extractEducationRequirements(description), [
    'High school diploma plus program in Law and Security, Police Foundations',
  ]);
  assert.deepEqual(extractExperienceRequirements(description), [
    '2–6 months',
  ]);
});

test('normalizes parenthetical numbers and identifies truncated values', () => {
  assert.equal(
    normalizeExperienceRequirement('A minimum of five (5) years of progressive HR experience'),
    '5+ years',
  );
  assert.equal(isTruncatedExperienceRequirement('15+ years of experience (e'), true);
  assert.equal(isTruncatedExperienceRequirement('15+ years of experience (e.g., energy)'), false);
});

test('normalizes long duration-led Experience values without dropping alternatives', () => {
  assert.equal(
    normalizeExperienceRequirement('Minimum 7 years of experience in platform engineering with minimum 3 years leading a team'),
    '7+ years',
  );
  assert.equal(
    normalizeExperienceRequirement('3 years experience, OR college diploma and 5 years experience, OR high school diploma and 7 years experience'),
    '3 years',
  );
});

test('moves non-duration Experience detail into Qualifications', () => {
  assert.equal(
    appendExperienceQualificationBullets('## Overview\nRole summary', [
      '5+ years — Platform engineering',
      'Experience with leading complex regulatory proceedings',
      'Several years — Public administration',
    ]),
    '## Overview\nRole summary\n\n## Qualifications\n- 5+ years — Platform engineering\n- Experience with leading complex regulatory proceedings\n- Several years — Public administration',
  );
});

test('drops a bare Several years Experience value', () => {
  assert.equal(normalizeExperienceRequirement('Several years'), null);
  assert.equal(normalizeExperienceRequirement('Recent (within past 5 years) — municipal policy'), null);
});

test('recovers duration-led Experience clauses from concatenated raw source text', () => {
  assert.deepEqual(
    extractExperienceRequirementsFromSources('', '## QualificationsMinimum of 5 years of progressive HR experience.'),
    ['5 years'],
  );
});

test('strips Experience and bilingual language restatements from Qualifications', () => {
  const result = stripStructuredQualBullets(`## Qualifications
- Minimum of 1-year experience in administrative support roles in a high-volume environment
- Proficiency in both French and English (reading, writing, speaking)
- Effective interpersonal and communication skills`, {
    experience: ['1+ years'],
    languages: ['Bilingual'],
  });
  assert.equal(result, `## Qualifications
- Minimum of 1-year experience in administrative support roles in a high-volume environment
- Effective interpersonal and communication skills`);
});

test('strips language restatements while preserving non-language qualification facts', () => {
  const result = stripStructuredQualBullets(`## Qualifications
- English essential
- Experience using technology to facilitate learning, English essential
- Excellent communication skills in French
- BA in English Literature required
- Ability to communicate in a language other than English or French
- Active bilingualism is an advantage

## Qualifications
Applicants must have the ability to:
- Speak English fluently.
`, { languages: ['English', 'French', 'Bilingual'] });
  assert.equal(result, `## Qualifications
- Experience using technology to facilitate learning
- BA in English Literature required
- Ability to communicate in a language other than English or French
- Active bilingualism is an advantage

## Qualifications
Applicants must have the ability to:`);
});

test('matches word-number Experience bullets to canonical duration values', () => {
  const result = stripStructuredQualBullets(`## Qualifications
- Minimum three (3) years of recent and relevant social work practice experience
- Ability to work independently`, {
    experience: ['3+ years'],
  });
  assert.equal(result, `## Qualifications
- Recent and relevant social work practice experience
- Ability to work independently`);
});

test('strips measurable typing bullets already represented in Skills', () => {
  const result = stripStructuredQualBullets(`## Qualifications
- Typing 40-50 w.p.m. with accuracy
- Ability to work independently`, {
    requiredSkills: ['Typing 40–50 w.p.m.'],
  });
  assert.equal(result, `## Qualifications
- Ability to work independently`);
});

test('strips student attendance bullets already represented in Student', () => {
  const result = stripStructuredQualBullets(`## Qualifications
- Currently attending a Full-time program.
- Strong customer service skills.`, { studentRequired: true });
  assert.equal(result, `## Qualifications
- Strong customer service skills.`);
});

test('drops obvious stale overview and software-licence values during reconciliation', () => {
  const result = reconcileStructuredRequirements('## Overview\nA college is a post-secondary institution offering programs.\n\n## Qualifications\n- Must possess a valid Class G driver\'s licence', {
    education_requirements: ['A college is a leading post-secondary institution offering programs.'],
    license_requirements: ['Track software license information for compliance', 'registered as a full-time student'],
    benefits: [],
    required_skills: [],
  });
  assert.deepEqual(result.education_requirements, []);
  assert.deepEqual(result.license_requirements, []);
});

test('keeps cash handling as a Skill while Experience stores only the duration', () => {
  const result = reconcileStructuredRequirements('', {
    experience_requirements: ['1+ years — Handling cash'],
    required_skills: [],
  });
  assert.deepEqual(result.experience_requirements, ['1+ years']);
  assert.deepEqual(result.required_skills, ['Cash handling']);
});

test('extracts required licences and excludes optional licences', () => {
  assert.deepEqual(extractLicenseRequirements(`## Qualifications
- Valid Class 'G' Ontario Driver's License with no more than six demerit points
- Registered Professional Engineer in Ontario

## Nice to Have
- A DZ licence is an asset
`), [
    'Ontario Class G',
    'P.Eng. (Ontario)',
  ]);
});

test('keeps travel and overtime out of a driver licence requirement', () => {
  assert.deepEqual(extractLicenseRequirements(`## Qualifications
Possession of a valid driver’s licence that authorizes the holder to independently operate a passenger-class vehicle.- Travel: sometimes on short notice.- Overtime: including evenings and weekends.
`), ["Driver's licence"]);
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
  assert.deepEqual(result.license_requirements, []);
  assert.deepEqual(result.benefits, ['Pension', 'OMERS']);
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
  assert.equal(extractListingType('The position will remain open until filled.', 'Project Coordinator'), 'regular');
  assert.equal(extractListingType('Apply by August 15 for this specific vacancy.', 'Program Coordinator'), 'regular');
  assert.equal(extractListingType('Any role may be considered for the candidate pool.', 'Analyst', true), 'inventory');
  assert.equal(extractListingType('A hiring pool will be used for upcoming vacancies.', 'Child Protection Social Worker (Hiring Pool)'), 'ongoing_recruitment');
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

test('classifies applicant pools as candidate inventory', () => {
  assert.equal(extractListingType('Carleton University is building a pool of candidates for temporary casual assignments.', 'Applicant Pool'), 'inventory');
  assert.equal(extractListingType('Vacancy Type: This is for all current and future permanent part-time vacancies.', 'Recreation Assistant - RE-POST (Periodic Posting)'), 'inventory');
  assert.equal(extractListingType('The City is establishing an eligibility list of qualified applicants in anticipation of future vacancies.', 'Firefighter (Eligibility List)'), 'inventory');
});

test('classifies an explicit future-vacancy inventory separately', () => {
  assert.equal(extractListingType('When you apply to this selection process, you are not applying for a specific job, but to an inventory for future vacancies.', 'Casual Stable Worker'), 'inventory');
  // Common GC wording without "for future vacancies" glued to inventory.
  assert.equal(
    extractListingType(
      'This process is being used to staff current and future vacancies in Calgary or Edmonton, Alberta. When you apply, you are not applying for a specific job but to an inventory; applicants who meet the qualifications may be contacted for further assessment as positions become available.',
      'Legal Support Clerk / Litigation Legal Assistant',
    ),
    'inventory',
  );
  assert.equal(extractListingType('Various administrative roles.', 'Casual Inventory - STREAM 1 CR-04'), 'inventory');
  assert.equal(
    extractListingType(
      'Candidates will be placed in an inventory for future heavy-equipment-operator hiring at participating airports.',
      'Various positions related to airport maintenance',
    ),
    'inventory',
  );
  assert.equal(
    extractListingType(
      'Intent of the process A pool of qualified candidates will be established to staff positions in Quebec City, Quebec. This pool may be used to staff positions with similar qualifications.',
      'Veterinarian – Animal Health',
    ),
    'inventory',
  );
});

test('normalizeListingType maps short labels to the three tokens', () => {
  assert.equal(normalizeListingType('regular'), 'regular');
  assert.equal(normalizeListingType('inventory'), 'inventory');
  assert.equal(normalizeListingType('ongoing_recruitment'), 'ongoing_recruitment');
  assert.equal(normalizeListingType('Ongoing recruitment'), 'ongoing_recruitment');
  assert.equal(normalizeListingType('candidate inventory'), 'inventory');
  assert.equal(normalizeListingType('candidate pool'), 'ongoing_recruitment');
  assert.equal(normalizeListingType('open until filled'), 'ongoing_recruitment');
  assert.equal(normalizeListingType('standard'), 'regular');
  assert.equal(normalizeListingType(null), 'regular');
  assert.equal(normalizeListingType('anything else'), 'regular');
  assert.equal(normalizeListingType('regular', true), 'inventory');
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
  assert.deepEqual(extractLanguageRequirements('Various language requirements: English only, French only, or Bilingual competencies.'), []);
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

test('does not infer a vehicle requirement from non-driver licence classes', () => {
  assert.equal(licensesImplyVehicle(['Class 1 or 2 ACV Engineering licence']), false);
  assert.equal(licensesImplyVehicle(['Third Class Operating Engineer Certification']), false);
  assert.equal(licensesImplyVehicle(['Ontario Class G']), true);
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
  assert.equal(normalizeVehicleRequired('yes'), true);
  assert.equal(normalizeVehicleRequired('not required'), false);
  assert.equal(normalizeSecurityCheckRequired(1), true);
  assert.equal(normalizeSecurityCheckRequired(0), false);
  assert.equal(normalizeSecurityCheckRequired('required'), true);
  assert.equal(requirementFlagToDb(true), 1);
  assert.equal(requirementFlagToDb(false), 0);
  assert.equal(requirementFlagToDb(null), null);
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
  // Leftover federal pair still in corpus as of 2026-08
  assert.deepEqual(
    normalizeLanguageRequirements(['French Essential', 'Bilingual (BBB/BBB)']),
    ['French', 'Bilingual'],
  );
  // Extra words beyond the language name must drop
  assert.deepEqual(normalizeLanguageRequirements(['French needed']), ['French']);
  assert.deepEqual(normalizeLanguageRequirements(['English required']), ['English']);
  assert.deepEqual(normalizeLanguageRequirements(['French language proficiency']), ['French']);
  assert.deepEqual(normalizeLanguageRequirements(['Must be fluent in French']), ['French']);
  assert.deepEqual(normalizeLanguageRequirements(['English only']), ['English']);
  assert.deepEqual(normalizeLanguageRequirements(['Spanish']), ['Spanish']);
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
