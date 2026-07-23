'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  shouldValidate,
  validatePr,
  buildCommentBody,
  labelsForFailure,
} = require('../src/validate');
const {
  parseBool,
  parseIntOrDefault,
  parseCommaList,
  isBlank,
} = require('../src/config');
const { DEFAULTS, DEFAULT_VALID_TYPES } = require('../src/defaults');

describe('shouldValidate', () => {
  it('validates on opened', () => {
    const result = shouldValidate({ action: 'opened' });
    assert.equal(result.shouldValidate, true);
  });

  it('skips commit-only edits', () => {
    const result = shouldValidate({ action: 'edited', changes: {} });
    assert.equal(result.shouldValidate, false);
  });

  it('validates when title changes', () => {
    const result = shouldValidate({
      action: 'edited',
      changes: { title: { from: 'old' } },
    });
    assert.equal(result.shouldValidate, true);
  });

  it('validates when body changes', () => {
    const result = shouldValidate({
      action: 'edited',
      changes: { body: { from: 'old' } },
    });
    assert.equal(result.shouldValidate, true);
  });
});

describe('parsers', () => {
  it('treats blank as default for bool/int/list', () => {
    assert.equal(isBlank(''), true);
    assert.equal(isBlank('  '), true);
    assert.equal(parseBool('', true), true);
    assert.equal(parseBool('false', true), false);
    assert.equal(parseBool('true', false), true);
    assert.equal(parseIntOrDefault('', 30), 30);
    assert.equal(parseIntOrDefault('40', 30), 40);
    assert.equal(parseIntOrDefault('nope', 30), 30);
    assert.deepEqual(parseCommaList('', ['feat', 'fix']), ['feat', 'fix']);
    assert.deepEqual(parseCommaList('feat, fix ,chore', ['x']), [
      'feat',
      'fix',
      'chore',
    ]);
    assert.deepEqual(parseCommaList(DEFAULT_VALID_TYPES, []), [
      'feat',
      'fix',
      'docs',
      'style',
      'refactor',
      'perf',
      'test',
      'chore',
      'build',
      'ci',
      'revert',
      'release',
    ]);
  });
});

describe('validatePr', () => {
  const validTypes = DEFAULTS.valid_types;

  it('passes a valid conventional title with description', () => {
    const result = validatePr({
      title: 'feat(automl): add neural architecture search for tabular data',
      body: 'Adds NAS support for tabular pipelines.',
      validTypes,
      minTitleLength: 30,
    });
    assert.equal(result.isValid, true);
    assert.deepEqual(result.issues, []);
  });

  it('always fails invalid format even when other checks are off', () => {
    const result = validatePr({
      title: 'Add something without conventional type prefix here',
      body: '',
      validTypes,
      minTitleLength: 30,
      validateDescription: false,
      validateTitleLength: false,
      validateLowercase: false,
    });
    assert.equal(result.isValid, false);
    assert.ok(result.issues.some((i) => i.includes('Invalid conventional commit format')));
  });

  it('fails short title when length validation is on', () => {
    const result = validatePr({
      title: 'feat: short',
      body: 'desc',
      validTypes,
      minTitleLength: 30,
      validateTitleLength: true,
    });
    assert.equal(result.isValid, false);
    assert.ok(result.issues.some((i) => i.includes('Title too short')));
  });

  it('allows short title when length validation is off', () => {
    const result = validatePr({
      title: 'feat: short title ok',
      body: 'desc',
      validTypes,
      minTitleLength: 30,
      validateTitleLength: false,
    });
    assert.equal(result.isValid, true);
  });

  it('fails uppercase first word when lowercase validation is on', () => {
    const result = validatePr({
      title: 'feat(model): Resolve data leakage in cross-validation strategy',
      body: 'desc',
      validTypes,
      minTitleLength: 30,
    });
    assert.equal(result.isValid, false);
    assert.ok(result.issues.some((i) => i.includes('lowercase')));
  });

  it('allows uppercase when lowercase validation is off', () => {
    const result = validatePr({
      title: 'feat(model): Resolve data leakage in cross-validation strategy',
      body: 'desc',
      validTypes,
      minTitleLength: 30,
      validateLowercase: false,
    });
    assert.equal(result.isValid, true);
  });

  it('fails missing description when description validation is on', () => {
    const result = validatePr({
      title: 'feat(automl): add neural architecture search for tabular data',
      body: '',
      validTypes,
      minTitleLength: 30,
      validateDescription: true,
    });
    assert.equal(result.isValid, false);
    assert.ok(result.issues.includes('Description missing'));
  });

  it('allows missing description when description validation is off', () => {
    const result = validatePr({
      title: 'feat(automl): add neural architecture search for tabular data',
      body: '',
      validTypes,
      minTitleLength: 30,
      validateDescription: false,
    });
    assert.equal(result.isValid, true);
  });
});

describe('labelsForFailure', () => {
  it('maps checks to configurable labels', () => {
    const labels = labelsForFailure(
      {
        isTitleValid: false,
        isTitleLongEnough: false,
        firstWordLowerCase: false,
        hasDescription: false,
      },
      {
        validateDescription: true,
        validateTitleLength: true,
        validateLowercase: true,
        labels: {
          needsFix: 'needs-fix',
          titleFormat: 'needs-title-fix',
          titleLength: 'needs-title-length',
          titleCase: 'needs-title-case',
          description: 'needs-description',
        },
      }
    );
    assert.deepEqual(labels, [
      'needs-fix',
      'needs-title-fix',
      'needs-title-length',
      'needs-title-case',
      'needs-description',
    ]);
  });

  it('skips labels for disabled checks', () => {
    const labels = labelsForFailure(
      {
        isTitleValid: true,
        isTitleLongEnough: false,
        firstWordLowerCase: false,
        hasDescription: false,
      },
      {
        validateDescription: false,
        validateTitleLength: false,
        validateLowercase: false,
      }
    );
    assert.deepEqual(labels, ['needs-fix']);
  });
});

describe('buildCommentBody', () => {
  it('includes identifier on pass and fail', () => {
    const pass = buildCommentBody({
      isValid: true,
      title: 'feat(scope): add something long enough here',
      checks: { titleLength: 42, minTitleLength: 30, hasDescription: true },
      issues: [],
      validTypes: ['feat'],
      commentIdentifier: 'PR Title Validation',
      descriptionHint: 'hint',
      examples: 'feat(x): add yyyyyyyyyyyyyyyyyyyyy',
    });
    assert.match(pass, /PR Title Validation Passed/);

    const fail = buildCommentBody({
      isValid: false,
      title: 'bad',
      checks: {
        titleLength: 3,
        minTitleLength: 30,
        isTitleLongEnough: false,
        firstWordLowerCase: true,
        hasDescription: false,
        isTitleValid: false,
      },
      issues: ['Invalid conventional commit format'],
      validTypes: ['feat'],
      commentIdentifier: 'PR Title Validation',
      descriptionHint: 'Please describe.',
      examples: 'feat(x): add yyyyyyyyyyyyyyyyyyyyy',
    });
    assert.match(fail, /PR Title Validation Failed/);
    assert.match(fail, /Please describe/);
  });
});
