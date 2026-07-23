'use strict';

const DEFAULT_VALID_TYPES =
  'feat,fix,docs,style,refactor,perf,test,chore,build,ci,revert,release';

const DEFAULT_EXAMPLES = [
  'feat(scope): add support for new feature',
  'fix(scope): resolve edge case in validation',
  'docs(readme): document conventional PR requirements',
].join('\n');

const DEFAULTS = {
  min_title_length: 30,
  valid_types: DEFAULT_VALID_TYPES,
  validate_description: true,
  validate_title_length: true,
  validate_lowercase: true,
  skip_on_commit_push: true,
  comment_identifier: 'PR Title Validation',
  fail_on_error: true,
  description_hint: 'Please provide a description of your changes.',
  examples: DEFAULT_EXAMPLES,
  post_comment: true,
  manage_labels: true,
  label_needs_fix: 'needs-fix',
  label_needs_title_fix: 'needs-title-fix',
  label_needs_title_length: 'needs-title-length',
  label_needs_title_case: 'needs-title-case',
  label_needs_description: 'needs-description',
};

module.exports = {
  DEFAULTS,
  DEFAULT_VALID_TYPES,
  DEFAULT_EXAMPLES,
};
