'use strict';

const core = require('@actions/core');
const { DEFAULTS } = require('./defaults');

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function getRawInput(name) {
  return core.getInput(name);
}

function getInputOrDefault(name, defaultValue) {
  const value = getRawInput(name);
  if (isBlank(value)) return defaultValue;
  return String(value).trim();
}

function parseBool(value, defaultValue = false) {
  if (isBlank(value)) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function parseIntOrDefault(value, defaultValue) {
  if (isBlank(value)) return defaultValue;
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function parseCommaList(value, defaultList) {
  if (isBlank(value)) {
    return Array.isArray(defaultList)
      ? defaultList.slice()
      : parseCommaList(defaultList, []);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveGithubToken() {
  const fromInput = getRawInput('github_token');
  if (!isBlank(fromInput)) return String(fromInput).trim();
  if (!isBlank(process.env.GITHUB_TOKEN)) return process.env.GITHUB_TOKEN;
  if (!isBlank(process.env.GH_TOKEN)) return process.env.GH_TOKEN;
  return '';
}

/**
 * Resolve all action inputs. Omitted or empty values fall back to DEFAULTS.
 */
function loadConfig() {
  const validTypesDefault = parseCommaList(DEFAULTS.valid_types, []);

  return {
    githubToken: resolveGithubToken(),
    minTitleLength: parseIntOrDefault(
      getRawInput('min_title_length'),
      DEFAULTS.min_title_length
    ),
    validTypes: parseCommaList(getRawInput('valid_types'), validTypesDefault),
    validateDescription: parseBool(
      getRawInput('validate_description'),
      DEFAULTS.validate_description
    ),
    validateTitleLength: parseBool(
      getRawInput('validate_title_length'),
      DEFAULTS.validate_title_length
    ),
    validateLowercase: parseBool(
      getRawInput('validate_lowercase'),
      DEFAULTS.validate_lowercase
    ),
    skipOnCommitPush: parseBool(
      getRawInput('skip_on_commit_push'),
      DEFAULTS.skip_on_commit_push
    ),
    commentIdentifier: getInputOrDefault(
      'comment_identifier',
      DEFAULTS.comment_identifier
    ),
    failOnError: parseBool(getRawInput('fail_on_error'), DEFAULTS.fail_on_error),
    descriptionHint: getInputOrDefault(
      'description_hint',
      DEFAULTS.description_hint
    ),
    examples: getInputOrDefault('examples', DEFAULTS.examples),
    postComment: parseBool(getRawInput('post_comment'), DEFAULTS.post_comment),
    manageLabels: parseBool(getRawInput('manage_labels'), DEFAULTS.manage_labels),
    labels: {
      needsFix: getInputOrDefault('label_needs_fix', DEFAULTS.label_needs_fix),
      titleFormat: getInputOrDefault(
        'label_needs_title_fix',
        DEFAULTS.label_needs_title_fix
      ),
      titleLength: getInputOrDefault(
        'label_needs_title_length',
        DEFAULTS.label_needs_title_length
      ),
      titleCase: getInputOrDefault(
        'label_needs_title_case',
        DEFAULTS.label_needs_title_case
      ),
      description: getInputOrDefault(
        'label_needs_description',
        DEFAULTS.label_needs_description
      ),
    },
  };
}

function allLabelNames(labels) {
  return [
    labels.needsFix,
    labels.titleFormat,
    labels.titleLength,
    labels.titleCase,
    labels.description,
  ];
}

module.exports = {
  isBlank,
  getInputOrDefault,
  parseBool,
  parseIntOrDefault,
  parseCommaList,
  resolveGithubToken,
  loadConfig,
  allLabelNames,
};
