import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanJobDescription, cleanOverviewBoilerplate, removePlaceholderSections, stripStructuredBenefitRestatements } from '../cleanup_description';
import { cleanSourceDescriptionBoilerplate } from '../source-description-cleanup';

test('removes preceding employer copy at paragraph boundaries', () => {
  const result = cleanOverviewBoilerplate(
    'The university is a leading research institution.\n\nThe Research Associate will coordinate studies and analyze results.',
    'Research Associate'
  );
  assert.equal(result, 'The Research Associate will coordinate studies and analyze results.');
});

test('keeps the complete role paragraph when a person name precedes the title', () => {
  const result = cleanOverviewBoilerplate(
    'The lab studies health outcomes across Canada.\n\nReporting to Monica Aggarwal, the Research Associate will manage recruitment and data analysis.',
    'Research Associate'
  );
  assert.equal(result, 'Reporting to Monica Aggarwal, the Research Associate will manage recruitment and data analysis.');
});

test('does not change an overview without a distinct boilerplate paragraph', () => {
  const overview = 'The Program Administrator coordinates scheduling and supports applicants.';
  assert.equal(cleanOverviewBoilerplate(overview, 'Program Administrator'), overview);
});

test('removes sentence-level employer copy without cutting the role sentence', () => {
  assert.equal(
    cleanOverviewBoilerplate(
      'The university is a leading research institution. The Research Associate will coordinate studies and analyze results.',
      'Research Associate'
    ),
    'The Research Associate will coordinate studies and analyze results.'
  );
});

test('strips fused city-tourism lead-in from municipal overviews', () => {
  assert.equal(
    cleanOverviewBoilerplate(
      'Cornwall is a community of 47,000 on the St. Lawrence River in Eastern Ontario. The city offers urban amenities and quality of life. The Case Manager assesses client needs and eligibility, develops service plans, and coordinates support services to assist individuals and families in accessing human services programs.',
      'Case Manager',
    ),
    'The Case Manager assesses client needs and eligibility, develops service plans, and coordinates support services to assist individuals and families in accessing human services programs.',
  );
});

test('strips multi-paragraph municipal tourism even when body title mismatches', () => {
  const result = cleanOverviewBoilerplate(
    `Cornwall is a beautiful community with a population of 47,000 situated on the banks of the St. Lawrence River in Eastern Ontario. The city offers a wide array of urban amenities, making it an excellent place for a career and raising a family. With a growing economy, expanding population and fantastic quality of life, there has never been a better time to start the next phase of your career with the City of Cornwall! Cornwall is a diverse and progressive community where residents and partners feel safe, welcomed, and enjoy a high quality of life supported by access to financially responsible and sustainable municipal services and infrastructure.

The Program Administrator is responsible for coordinating and administering business support programs.`,
    'Client Services Representative, Visual Arts',
  );
  assert.equal(
    result,
    'The Program Administrator is responsible for coordinating and administering business support programs.',
  );
});

test('removes an inline marketing label before the role summary', () => {
  assert.equal(
    cleanOverviewBoilerplate(
      'The university is a leading research institution.\n\nYour opportunity: Reporting to the DSI Academic Director, the Executive Director, DSI leads the program.',
      'Executive Director, DSI'
    ),
    'Reporting to the DSI Academic Director, the Executive Director, DSI leads the program.'
  );
});

test('removes standalone social and generic equity boilerplate without deleting duties', () => {
  const result = cleanJobDescription(`## Responsibilities
- Coordinate student services.

Learn more about the employer on Instagram.

We are an equal opportunity employer and strive to meet the accommodation needs of persons with disabilities.`, 'Coordinator');
  assert.equal(result, '## Responsibilities\n- Coordinate student services.');
});

test('deduplicates repeated bullets inside a section', () => {
  const result = cleanJobDescription(`## Qualifications
- Valid Class G licence.
- Valid Class G licence.
- Three years of experience.`, 'Operator');
  assert.equal(result, '## Qualifications\n- Valid Class G licence.\n- Three years of experience.');
});

test('canonicalizes WordPress as one word', () => {
  assert.equal(
    cleanJobDescription('## Qualifications\n- Experience with Word Press and Drupal.', 'Web Coordinator'),
    '## Qualifications\n- Experience with WordPress and Drupal.',
  );
});

test('removes sections whose only content is a placeholder', () => {
  const result = cleanJobDescription(`## Overview
## Responsibilities
- Operate equipment.
## Nice to Have
(No content)
## Compensation & Benefits
- None`, 'Operator');
  assert.equal(result, '## Responsibilities\n- Operate equipment.');
});

test('drops Compensation sections that only restate salary already in structured fields', () => {
  const result = cleanJobDescription(`## Responsibilities
- Lead the team.
## Compensation & Benefits
Salary range: $140,764.00 - $198,828.00 per year.`, 'Senior Manager');
  assert.equal(result, '## Responsibilities\n- Lead the team.');
  assert.ok(!result.includes('Compensation'));
});

test('drops annual salary plus generic federal benefits package restatement', () => {
  const result = cleanJobDescription(`## Qualifications
- Two years of experience.
## Compensation
Annual salary: $70,688–$86,007. The position includes the federal government benefits and pension package.`, 'Dispatcher');
  assert.ok(!result.includes('Compensation'));
  assert.ok(!result.includes('70,688'));
  assert.ok(result.includes('Two years'));
});

test('keeps Compensation sections that describe real benefits', () => {
  const result = cleanJobDescription(`## Responsibilities
- Lead the team.
## Compensation & Benefits
- Pension (OMERS)
- Extended health and dental`, 'Senior Manager');
  assert.ok(result.includes('Compensation & Benefits'));
  assert.ok(result.includes('OMERS'));
});

test('drops CMHC salary + structured benefits package restatement', () => {
  const result = cleanJobDescription(`## Responsibilities
- Lead servicing of multi-unit loans.
## Compensation & Benefits
- Salary range: $86,816.59 to $108,520.74 per year.
- Accrued vacation, annual individual performance bonus, group insurance, training and mentorship, inclusive workplace culture.`, 'Specialist');
  assert.ok(!result.includes('Compensation'));
  assert.ok(!result.includes('86,816'));
  assert.ok(result.includes('Lead servicing'));
});

test('keeps unique pay like bilingual bonus', () => {
  const result = cleanJobDescription(`## Qualifications
- Degree required.
## Compensation
From $78,167 to $91,895 per annum. In addition, the incumbent who meets the language requirements will receive the Bilingualism Bonus of $800 per year.`, 'Officer');
  assert.ok(result.includes('Bilingualism Bonus'));
});

test('removes structured benefit restatements from Compensation & Benefits', () => {
  const result = stripStructuredBenefitRestatements(`## Responsibilities
- Lead the team.
## Compensation & Benefits
- Annual paid vacation and annual individual performance incentive.
- Pension (OMERS)
- Shift premium of $2.25/hour`, ['pension', 'vacation', 'performance incentive']);
  assert.equal(result, `## Responsibilities
- Lead the team.
## Compensation & Benefits
- OMERS
- Shift premium of $2.25/hour`);
});

test('keeps a Compensation detail line when the repeated benefit has unique context', () => {
  const description = `## Compensation & Benefits
Benefits package includes pension and reimbursement of eligible relocation expenses.`;
  assert.equal(
    stripStructuredBenefitRestatements(description, ['pension']),
    description,
  );
});

test('placeholder-only cleanup does not trim legitimate overview text', () => {
  const result = removePlaceholderSections(`## Overview
The department supports a growing community.
## Nice to Have
(No content)
## Qualifications
- Three years of experience.`);
  assert.equal(result, '## Overview\nThe department supports a growing community.\n\n## Qualifications\n- Three years of experience.');
});

test('placeholder-only cleanup removes completely empty sections', () => {
  const result = removePlaceholderSections('## Overview\\n\\n## Responsibilities\\n\\n## Qualifications\\n\\n## Nice to Have\\n');
  assert.equal(result, '');
});

test('removes the reviewed Metrolinx administrative suffix', () => {
  const result = cleanSourceDescriptionBoilerplate('Metrolinx', `## Qualifications
- Degree in planning.

**Don’t Meet Every Requirement?**
If you are excited about working with Metrolinx, we encourage you to apply.

Application Process:
All applicants must be legally entitled to work in Canada.

We thank all applicants for their interest.`);
  assert.equal(result, '## Qualifications\n- Degree in planning.');
});

test('removes repeated Metrolinx introduction paragraphs without deleting role content', () => {
  const result = cleanSourceDescriptionBoilerplate('Metrolinx', `**Contract Role**

Metrolinx is connecting communities across the Greater Golden Horseshoe. Metrolinx operates GO Transit and UP Express, as well as the PRESTO fare payment system. Metrolinx is an agency of the Government of Ontario.

At Metrolinx, equity, diversity and inclusion are essential to living our values of serving with passion, thinking forward and playing as a team.

Reporting to the manager, the advisor will deliver communications.`);
  assert.equal(result, '**Contract Role**\n\nReporting to the manager, the advisor will deliver communications.');
});

test('removes the reviewed Brock employer introduction without deleting role content', () => {
  const result = cleanSourceDescriptionBoilerplate('Brock University', `## Overview
Brock University is located on the traditional territory of the Haudenosaunee and Anishinaabe peoples, many of whom continue to live and work here today. This territory is covered by the Upper Canada Treaties and is within the land protected by the Dish with One Spoon Wampum Agreement. We are one of Canada's outstanding comprehensive universities, where excellence and innovation thrives! Brock has been recognized as a Top Employer in Hamilton-Niagara for seven consecutive years. Break through at Brock.

Reporting to the Associate Vice-President, the Director will lead technology operations and service delivery.`);
  assert.equal(result, '## Overview\n\nReporting to the Associate Vice-President, the Director will lead technology operations and service delivery.');
});

test('removes the reviewed Waterloo employer introduction without deleting role content', () => {
  const result = cleanSourceDescriptionBoilerplate('University of Waterloo', `## Overview
At the University of Waterloo, we create and promote a culture where everyone can reach their full potential. As an employee, you get support & opportunities that empower you to advance your career. Explore how we can bring big ideas to life, together. The University is a welcoming workplace for those of all abilities, interests, and expertise. As part of our workforce, you can do what you do best, every day. Learn more about our recruitment process.

The Administrative Coordinator provides support to undergraduate programs and research activities.`);
  assert.equal(result, '## Overview\n\nThe Administrative Coordinator provides support to undergraduate programs and research activities.');
});

test('removes GC work-environment / intent / important-messages process blocks', () => {
  const input = `**Work environment:**

The Public Prosecution Service of Canada (PPSC) is a national organization of approximately 1,000 employees across Canada, dedicated to prosecuting federal offences. We offer meaningful career opportunities for legal and business professionals.

Our updated Mission and Values reflect a strong commitment to Truth and Reconciliation, as well as Equity and Inclusion. We recognize the impact of systemic discrimination and are working to support a fairer justice system for all, particularly Indigenous and racialized communities.

At the PPSC, every employee contributes to a workplace where people feel valued, respected, and empowered to bring their whole selves to work. Through our Equity, Diversity, Inclusion, and Accessibility (EDIA) structure, employees can engage with one of five National Councils for Employees: Persons living with Disabilities, Racialized Persons, Black Persons, Indigenous Peoples, and 2SLGBTQIA+.

**Intent of the process:**
This process is being used to staff current and future vacancies. A list of qualified and/or partially qualified candidates will be established from this process to staff positions in Calgary or Edmonton, Alberta, with varying tenures and/or security requirements according to the position to be staffed.

When you apply to this selection process, you are not applying for a specific job, but to an inventory. As positions become available, applicants who meet the qualifications may be contacted for further assessment.

**Important messages**
Successful applicants are required to work in Calgary or Edmonton, Alberta, depending on the location of the position being staffed. Telework or alternate work locations will not be an option. Persons selected for appointments must reside within a commutable distance of the workplace.

**Essential Qualifications:**
- Successful completion of a post-secondary diploma or degree in a law related field
`;
  const result = cleanSourceDescriptionBoilerplate('Government of Canada', input);
  assert.match(result, /Essential Qualifications/);
  assert.match(result, /post-secondary diploma or degree in a law related field/);
  assert.doesNotMatch(result, /Work environment/i);
  assert.doesNotMatch(result, /Intent of the process/i);
  assert.doesNotMatch(result, /Important messages/i);
  assert.doesNotMatch(result, /1,000 employees/);
  assert.doesNotMatch(result, /not applying for a specific job/i);
  assert.doesNotMatch(result, /commutable distance/i);
});

test('keeps duty-heavy GC Work environment sections that are not employer pitch', () => {
  const input = `### Work environment
BSOs across Canada facilitate legitimate trade and travel while preventing prohibited goods from entering the country.

Following assessment, candidates must successfully complete the Officer Induction Training Program (OITP).

### Essential qualifications
**Education:** Secondary school diploma
`;
  const result = cleanSourceDescriptionBoilerplate('Government of Canada', input);
  assert.match(result, /Officer Induction Training Program/);
  assert.match(result, /Secondary school diploma/);
});

test('removes the reviewed Barrie administrative blocks without deleting requirements', () => {
  const result = cleanSourceDescriptionBoilerplate('City of Barrie', `## Qualifications
- Valid Class G licence.

The City of Barrie is an equal opportunity employer, dedicated to creating a workplace culture of inclusiveness and welcomes applications from qualified individuals of diverse backgrounds. We are committed to providing barrier-free and accessible employment practices and we will accommodate the needs of applicants under the Ontario Human Rights Code throughout all stages of the recruitment and selection process. If contacted for an employment opportunity, please advise if you require Code-protected accommodation and we will work with you to meet your needs.

The job posting has been designed to indicate the general nature and essential duties and responsibilities of work performed by employees within this position. It may not contain a comprehensive inventory of all duties and responsibilities required of employees to do this job. For full position details, please request a copy of the job description by emailing HR.Recruitment@Barrie.ca.`);
  assert.equal(result, '## Qualifications\n- Valid Class G licence.');
});

test('removes the reviewed St. Catharines administrative footer', () => {
  const result = cleanSourceDescriptionBoilerplate('City of St. Catharines', `## Responsibilities
- Operate municipal equipment.

Additional Information:Equal Opportunity EmployerThe City of St. Catharines is committed to fostering an inclusive, accessible, and respectful work environment. Don’t Meet Every Requirement?We encourage individuals from all backgrounds to apply. Accommodation is available throughout the recruitment process. Application ProcessSubmit online. Interviews and AssessmentsTests may be used. Use of AIThe City does not use artificial intelligence.`);
  assert.equal(result, '## Responsibilities\n- Operate municipal equipment.');
});

test('removes the formatted St. Catharines administrative section', () => {
  const result = cleanSourceDescriptionBoilerplate('City of St. Catharines', `# Municipal Operator
## Responsibilities
- Operate municipal equipment.

## Additional Information
- Equal Opportunity Employer.
- Accommodation available upon request.
- Applications must be submitted online.`);
  assert.equal(result, '# Municipal Operator\n## Responsibilities\n- Operate municipal equipment.');
});

test('preserves a real job-title heading during source cleanup', () => {
  const result = cleanSourceDescriptionBoilerplate('City of St. Catharines', `# Program Assistant, Special Anniversary Initiatives
## About the Role
The Program Assistant supports civic anniversary initiatives.`);
  assert.equal(result, '# Program Assistant, Special Anniversary Initiatives\n## About the Role\nThe Program Assistant supports civic anniversary initiatives.');
});

test('does not cut role content between Metrolinx boilerplate sentences', () => {
  const result = cleanSourceDescriptionBoilerplate('Metrolinx', `Metrolinx is connecting communities across the Greater Golden Horseshoe. Our Capital Projects Group is hiring a Manager to deliver safety programs. Metrolinx is an agency of the Government of Ontario.

- Manage system safety documentation and approvals.

**Additional Information**
- Accommodation available upon request.`);
  assert.match(result, /Our Capital Projects Group is hiring a Manager/);
  assert.match(result, /Manage system safety documentation/);
  assert.doesNotMatch(result, /Accommodation available upon request/);
});

test('removes the compact Metrolinx introduction variant without deleting role content', () => {
  const result = cleanSourceDescriptionBoilerplate('Metrolinx', `## Overview
Metrolinx is connecting communities across the Greater Golden Horseshoe, operating GO Transit and UP Express, as well as the PRESTO fare payment system. We are also building new and improved rapid transit. Metrolinx is an agency of the Government of Ontario.

The Partnership Sales Manager will develop corporate opportunities and manage client relationships.`);
  assert.equal(result, '## Overview\n\nThe Partnership Sales Manager will develop corporate opportunities and manage client relationships.');
});

test('removes the shortened Metrolinx introduction variant without deleting role content', () => {
  const result = cleanSourceDescriptionBoilerplate('Metrolinx', `## Overview
Metrolinx is connecting communities across the Greater Golden Horseshoe, operating GO Transit and UP Express, as well as the PRESTO fare payment system. We are also building new and improved rapid transit, including GO Expansion, Light Rail Transit routes, and major expansions to Toronto’s subway system.

The Partnership Sales Manager will develop corporate opportunities.`);
  assert.equal(result, '## Overview\n\nThe Partnership Sales Manager will develop corporate opportunities.');
});

test('removes a structural heading left empty by source cleanup', () => {
  const result = cleanSourceDescriptionBoilerplate('Metrolinx', `## Overview
Metrolinx is connecting communities across the Greater Golden Horseshoe, operating GO Transit and UP Express, as well as the PRESTO fare payment system. We are also building new and improved rapid transit, including GO Expansion, Light Rail Transit routes, and major expansions to Toronto’s subway system.

## Responsibilities
- Lead service improvements.`);
  assert.equal(result, '## Responsibilities\n- Lead service improvements.');
});

test('removes empty Metrolinx footer bullets and headings', () => {
  const result = cleanSourceDescriptionBoilerplate('Metrolinx', `## Qualifications
- Valid licence.

**Additional Information**
- We are committed to equity, diversity and inclusion.
- Accommodation available upon request.
- All applicants must be legally entitled to work in Canada.`);
  assert.equal(result, '## Qualifications\n- Valid licence.');
});

test('keeps bold metadata that is not a heading', () => {
  const result = cleanSourceDescriptionBoilerplate('Metrolinx', '**Start Rate (Non-Negotiable) - $29.46**');
  assert.equal(result, '**Start Rate (Non-Negotiable) - $29.46**');
});

test('does not remove a role paragraph that merely mentions Metrolinx', () => {
  const description = '## Overview\nThe manager will improve Metrolinx service reliability.';
  assert.equal(cleanSourceDescriptionBoilerplate('Metrolinx', description), description);
});
