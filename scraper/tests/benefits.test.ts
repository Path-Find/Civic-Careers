import assert from 'node:assert/strict';
import test from 'node:test';
import { BENEFIT_OVERRIDES } from '../benefit-fixes';
import { normalizeBenefits } from '../requirements';

test('normalizes benefit labels and removes non-benefit work arrangements', () => {
  assert.deepEqual(normalizeBenefits([
    'Vacation Credit',
    'OMERS Pension',
    'Pension',
    'Life',
    'Accidental Death And Dismemberment',
    'EFAP',
    'Fitness Membership Discount',
    'Discounted Transit Passes',
    'Bus Pass',
    'Remote Work Programs',
    'Training and mentorship',
  ]), [
    'Vacation',
    'OMERS',
    'Life Insurance',
    'AD&D Insurance',
    'Employee Assistance Program',
    'Fitness Membership',
    'Transit Pass',
    'Employee Bus Pass',
  ]);
});

test('splits compound benefit labels into concrete quick facts', () => {
  assert.deepEqual(normalizeBenefits([
    'Wellness And Employee Assistance Programs',
    'Complimentary Fitness Centre Membership',
    'Access To BCIT Flexible Learning Courses',
  ]), ['Wellness', 'Employee Assistance Program', 'Fitness Membership']);
});

test('keeps named pension plans without a duplicate generic pension label', () => {
  assert.deepEqual(normalizeBenefits(['Pension', 'Public Service Pension Plan']), ['Public Service Pension Plan']);
});

test('canonicalizes compound insurance, incentive, and work-arrangement labels', () => {
  assert.deepEqual(normalizeBenefits([
    'Incentive',
    'Incentive Plan',
    'EAP',
    'Extended Health Care',
    'Dental Care',
    'Health & Dental Benefits',
    'Flexible Work Program',
    'Advancement Opportunities',
  ]), ['Performance Bonuses', 'Employee Assistance Program', 'Health Insurance', 'Dental Insurance']);
});

test('contains the reviewed source-specific corrections', () => {
  assert.deepEqual(BENEFIT_OVERRIDES['nanaimo_26_91'], ['Vacation']);
  assert.deepEqual(BENEFIT_OVERRIDES['1290201447'], [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vacation', 'Tool Allowance',
    'Paid Uniforms', 'Employee Assistance Program', 'Mental Health Support',
  ]);
  assert.deepEqual(BENEFIT_OVERRIDES['242422'], [
    'OMERS', 'Employee Assistance Program', 'Fitness Membership', 'Transit Pass', 'Perkopolis',
  ]);
  assert.deepEqual(BENEFIT_OVERRIDES['1291394147'], [
    'Health Insurance', 'Dental Insurance', 'Public Service Pension Plan',
    'Fitness Centre Membership', 'Employee Assistance Program', 'Employee Bus Pass', 'Wellness',
  ]);
});
