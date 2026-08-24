import type { ParsedJob } from './ai_parser';
import type { saveJobDetails } from './db';
import { normalizeDuration } from './duration';
import { extractLabeledLocation, normalizeLocation, normalizeSourceLocation, normalizeSourceLocationFromTitle } from './location';
import { extractRawJobTitle, extractSourceAcademicCourse, extractSourceAcademicCourseFromRaw, extractSourceAcademicTerm, extractSourceAcademicTermFromRaw, extractUrlJobTitle, isUsableJobTitle, normalizeSourceAcademicCourse } from './title';
import { normalizeEmploymentType, normalizeSalaryPeriod, normalizeUnionFields, normalizeWorkModel } from './validate';
import {
  appendExperienceQualificationBullets,
  classifyStudentRequirement,
  dedupeSkillsAgainstSoftware,
  extractCertificationRequirements,
  extractListingType,
  extractSecurityRequirementLabel,
  extractSoftwareRequirements,
  extractVehicleRequired,
  extractWorkYearDuration,
  normalizeLanguageRequirements,
  normalizeListingType,
  normalizeSecurityCheckRequired,
  normalizeVehicleRequired,
  reconcileStructuredRequirements,
  requirementFlagToDb,
  splitLanguageOutOfSkills,
  stripStructuredQualBullets,
} from './requirements';
import { cleanJobDescription, removePlaceholderSections, stripStructuredBenefitRestatements } from './cleanup_description';
import { GOVERNMENT_OF_CANADA_FIXES } from './source-fixes';
import { BENEFIT_OVERRIDES } from './benefit-fixes';
import { extractStartDate } from './start-date';
import { extractAcademicSchedule, isAcademicJob, normalizeAcademicOfficeHours } from './academic-context';
import { sourceMetadataFixFor } from './source-metadata-fixes';
import { classifyCareerStage } from './career-stage';
import { formatSalaryDisplay } from './salary-format';
import { evaluateJobQuality, type QualityEvaluation } from './quality-pipeline';
import { normalizeActiveClosingDateStatus } from './closing-date';
import { splitHoursAndAvailability } from './hours-availability';
import { extractBoardSpecificMetadata } from './board-parsers';
import { applyParserTitleRules, parserContext } from './parser-rules';

export type ParserRawJob = {
  id: string;
  url: string;
  application_url: string | null;
  source: string;
  raw_text: string;
  title: string | null;
  first_seen_at: string;
  posted_at: string | null;
};

export type ParsedCandidate = Parameters<typeof saveJobDetails>[1] & {
  quality: QualityEvaluation;
  appliedRuleIds: string[];
};

/**
 * The single per-job transformation used by fresh parsing, dry-run audits,
 * and future backfills. It does not write to the database.
 */
export function buildParsedCandidate(raw: ParserRawJob, aiResult: ParsedJob): ParsedCandidate {
  const sourceContext = parserContext(raw.source);
  const trustedSourceTitle = isUsableJobTitle(raw.title)
    ? raw.title
    : extractRawJobTitle(raw.source, raw.raw_text) || extractUrlJobTitle(raw.application_url ?? raw.url, raw.raw_text);
  const titleResults = [
    applyParserTitleRules(sourceContext, aiResult.job_title),
    applyParserTitleRules(sourceContext, trustedSourceTitle),
  ];
  const aiTitle = titleResults[0]!.title;
  const sourceTitle = titleResults[1]!.title;
  const finalTitleResult = applyParserTitleRules(
    sourceContext,
    isUsableJobTitle(aiTitle) ? aiTitle : sourceTitle,
    raw.raw_text,
  );
  const finalTitle = finalTitleResult.title;
  const sourceFix = GOVERNMENT_OF_CANADA_FIXES[raw.id];
  const sourceMetadataFix = sourceMetadataFixFor(raw.id, raw.raw_text);
  const deterministicMetadata = { ...extractBoardSpecificMetadata(raw.source, raw.raw_text), ...(sourceMetadataFix ?? {}) };

  let description = deterministicMetadata.description || sourceFix?.description || cleanJobDescription(aiResult.clean_description, aiResult.job_title, raw.source);
  const structuredRequirements = reconcileStructuredRequirements(description, {
    experience_requirements: aiResult.experience_requirements,
    education_requirements: aiResult.education_requirements,
    license_requirements: aiResult.license_requirements,
    benefits: aiResult.benefits,
    required_skills: aiResult.required_skills,
  }, raw.raw_text);
  const finalBenefits = deterministicMetadata.benefits ?? BENEFIT_OVERRIDES[raw.id] ?? structuredRequirements.benefits;
  description = stripStructuredBenefitRestatements(description, finalBenefits);
  description = appendExperienceQualificationBullets(description, aiResult.experience_requirements ?? []);

  const fromBodyCertifications = extractCertificationRequirements(description);
  const certificationRequirements = fromBodyCertifications.length
    ? fromBodyCertifications
    : aiResult.certification_requirements ?? [];
  const softwareRequirements = extractSoftwareRequirements(description).values;
  const finalSoftwareRequirements = softwareRequirements.length ? softwareRequirements : aiResult.software_requirements;
  const skillsWithoutSoftware = dedupeSkillsAgainstSoftware(structuredRequirements.required_skills, finalSoftwareRequirements ?? []);
  const { skills: finalSkills, languages: languagesFromSkills } = splitLanguageOutOfSkills(skillsWithoutSoftware);
  const finalLanguages = normalizeLanguageRequirements([
    ...(aiResult.language_requirements ?? []),
    ...languagesFromSkills,
  ]);
  const vehicleFromDescription = extractVehicleRequired(description);
  const vehicleFromAI = normalizeVehicleRequired(aiResult.vehicle_required);
  const vehicleRequired = vehicleFromDescription === true
    ? true
    : (vehicleFromAI ?? vehicleFromDescription);
  const isStudent = sourceFix?.isStudent ?? (classifyStudentRequirement(finalTitle, raw.raw_text) ? 1 : 0);
  const careerStage = classifyCareerStage({ title: finalTitle, rawText: raw.raw_text, isStudent });

  description = stripStructuredQualBullets(description, {
    licenses: structuredRequirements.license_requirements,
    education: structuredRequirements.education_requirements,
    experience: structuredRequirements.experience_requirements,
    languages: finalLanguages,
    requiredSkills: finalSkills,
    software: finalSoftwareRequirements,
    certifications: certificationRequirements,
    studentRequired: isStudent === 1,
    vehicleRequired,
    allSections: true,
  });
  description = removePlaceholderSections(description);

  const securityFromLabel = extractSecurityRequirementLabel(description);
  const securityCheckRequired = sourceFix?.securityCheckRequired
    ?? normalizeSecurityCheckRequired(aiResult.security_check_required)
    ?? securityFromLabel;
  const parsedLocation = normalizeLocation(aiResult.location);
  const location = deterministicMetadata.location || normalizeSourceLocation(raw.source, raw.raw_text)
    || normalizeSourceLocationFromTitle(raw.source, finalTitle)
    || parsedLocation || extractLabeledLocation(raw.raw_text);
  const unionFields = normalizeUnionFields(aiResult.union_name, aiResult.is_unionized);
  const pendingClosing = normalizeActiveClosingDateStatus(raw.raw_text);
  const academicAllowed = isAcademicJob(raw.source, finalTitle, aiResult.academic_role_type);
  const academicRoleType = academicAllowed ? aiResult.academic_role_type : null;
  const academicCourse = academicAllowed
    ? normalizeSourceAcademicCourse(raw.source, aiResult.academic_course || extractSourceAcademicCourseFromRaw(raw.source, raw.raw_text) || extractSourceAcademicCourse(raw.source, raw.title ?? aiResult.job_title))
    : '';
  const academicWorkload = academicAllowed ? aiResult.academic_workload : '';
  const academicOfficeHours = academicAllowed ? normalizeAcademicOfficeHours(aiResult.academic_office_hours) : '';
  const academicSupervisor = academicAllowed ? aiResult.academic_supervisor : '';
  const academicAppointmentType = academicAllowed ? aiResult.academic_appointment_type : '';
  const academicSchedule = academicAllowed
    ? (extractAcademicSchedule(raw.raw_text) || (aiResult as ParsedJob & { academic_schedule?: string }).academic_schedule || '')
    : '';
  const duration = deterministicMetadata.duration ?? normalizeDuration(aiResult.duration || extractWorkYearDuration(description) || '');
  const academicTerm = extractSourceAcademicTermFromRaw(raw.source, raw.raw_text)
    || extractSourceAcademicTerm(raw.source, raw.title ?? aiResult.job_title);
  const parsedSchedule = splitHoursAndAvailability(
    deterministicMetadata.hours ?? aiResult.hours,
    deterministicMetadata.availability ?? aiResult.availability,
  );
  const salaryRange = deterministicMetadata.salaryRange ?? formatSalaryDisplay(
    aiResult.salary_min ?? null,
    aiResult.salary_max ?? null,
    normalizeSalaryPeriod(aiResult.salary_period),
  );
  const quality = evaluateJobQuality({
    source: raw.source,
    title: finalTitle,
    rawText: raw.raw_text,
    url: raw.url,
    applicationUrl: raw.application_url,
    closingDate: aiResult.closing_date || pendingClosing.date,
    closingDateStatus: aiResult.closing_date ? 'known' : pendingClosing.status,
    department: deterministicMetadata.department ?? aiResult.department,
    hours: parsedSchedule.hours,
    salary: salaryRange,
    location,
    unionName: unionFields.union_name,
    availability: parsedSchedule.availability,
    duration,
    academicCourse,
    academicSchedule,
    academicTerm,
    academicWorkload,
    academicOfficeHours,
    requiredSkills: JSON.stringify(finalSkills),
    softwareRequirements: JSON.stringify(finalSoftwareRequirements),
    responsibilityTags: JSON.stringify(aiResult.responsibility_tags),
    qualificationTags: JSON.stringify(aiResult.qualification_tags),
    educationRequirements: JSON.stringify(deterministicMetadata.educationRequirements ?? sourceFix?.educationRequirements ?? structuredRequirements.education_requirements),
  });
  const listingType = normalizeListingType(
    extractListingType(`${raw.raw_text}\n${description}`, raw.title ?? aiResult.job_title, aiResult.is_inventory),
    aiResult.is_inventory,
  );
  const appliedRuleIds = [...new Set(titleResults.flatMap(result => result.ruleIds).concat(finalTitleResult.ruleIds))];

  return {
    id: raw.id,
    job_title: finalTitle,
    department: deterministicMetadata.department ?? aiResult.department,
    location,
    workplace_address: aiResult.workplace_address,
    salary_range: salaryRange,
    description,
    closing_date: aiResult.closing_date || '',
    is_inventory: listingType === 'inventory' ? 1 : 0,
    listing_type: listingType,
    is_student: isStudent,
    salary_min: deterministicMetadata.salaryMin ?? aiResult.salary_min,
    salary_max: deterministicMetadata.salaryMax ?? aiResult.salary_max,
    salary_period: deterministicMetadata.salaryPeriod ?? normalizeSalaryPeriod(aiResult.salary_period),
    work_model: normalizeWorkModel(aiResult.work_model, finalTitle),
    employment_type: deterministicMetadata.employmentType ?? normalizeEmploymentType(aiResult.employment_type),
    duration,
    hours: parsedSchedule.hours,
    availability: parsedSchedule.availability,
    academic_role_type: academicRoleType,
    academic_course: academicCourse,
    academic_workload: academicWorkload,
    academic_office_hours: academicOfficeHours,
    academic_supervisor: academicSupervisor,
    academic_appointment_type: academicAppointmentType,
    academic_schedule: academicSchedule,
    academic_term: academicTerm,
    experience_requirements: JSON.stringify(deterministicMetadata.experienceRequirements ?? structuredRequirements.experience_requirements),
    is_unionized: unionFields.is_unionized ? 1 : 0,
    union_name: unionFields.union_name,
    benefits: JSON.stringify(finalBenefits),
    required_skills: JSON.stringify(finalSkills),
    education_requirements: JSON.stringify(deterministicMetadata.educationRequirements ?? sourceFix?.educationRequirements ?? structuredRequirements.education_requirements),
    license_requirements: JSON.stringify(deterministicMetadata.licenseRequirements ?? structuredRequirements.license_requirements),
    vehicle_required: requirementFlagToDb(vehicleRequired),
    language_requirements: JSON.stringify(deterministicMetadata.languageRequirements ?? finalLanguages),
    security_check_required: deterministicMetadata.securityCheckRequired === undefined
      ? requirementFlagToDb(normalizeSecurityCheckRequired(securityCheckRequired))
      : typeof deterministicMetadata.securityCheckRequired === 'number'
        ? deterministicMetadata.securityCheckRequired
        : requirementFlagToDb(normalizeSecurityCheckRequired(deterministicMetadata.securityCheckRequired)),
    certification_requirements: JSON.stringify(deterministicMetadata.certificationRequirements ?? (certificationRequirements.length ? certificationRequirements : aiResult.certification_requirements)),
    software_requirements: JSON.stringify(finalSoftwareRequirements),
    medical_requirements: JSON.stringify(sourceFix?.medicalRequirements ?? aiResult.medical_requirements),
    responsibility_tags: JSON.stringify(aiResult.responsibility_tags),
    qualification_tags: JSON.stringify(aiResult.qualification_tags),
    posted_at: raw.posted_at,
    start_date: extractStartDate(`${raw.raw_text}\n${description}`),
    career_stage: careerStage,
    publication_status: quality.status === 'fully_parsed' ? 'fully_parsed' : 'soft_parsed',
    parser_rule_ids: JSON.stringify(appliedRuleIds),
    quality,
    appliedRuleIds,
  };
}
