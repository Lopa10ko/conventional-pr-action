'use strict';

/**
 * Decide whether validation should run for this pull_request event.
 * Skip when edited only because new commits were pushed (no title/body change).
 */
function shouldValidate(payload, { skipOnCommitPush = true } = {}) {
  if (payload.action !== 'edited') {
    return { shouldValidate: true, reason: 'PR opened or non-edit event — validating' };
  }

  if (!skipOnCommitPush) {
    return { shouldValidate: true, reason: 'skip_on_commit_push disabled — validating' };
  }

  const changes = payload.changes || {};
  const titleChanged = Boolean(changes.title);
  const bodyChanged = Boolean(changes.body);
  const isCommitPush = !titleChanged && !bodyChanged;

  if (isCommitPush) {
    return { shouldValidate: false, reason: 'New commits pushed — skipping validation' };
  }

  if (titleChanged || bodyChanged) {
    return {
      shouldValidate: true,
      reason: `PR title or description changed (title: ${titleChanged}, body: ${bodyChanged})`,
    };
  }

  return { shouldValidate: false, reason: 'PR edited but title/description not changed — skipping' };
}

/**
 * Validate PR title/body against conventional commit rules.
 * Title format is always enforced; other checks are toggleable.
 */
function validatePr({
  title,
  body = '',
  validTypes,
  minTitleLength = 30,
  validateDescription = true,
  validateTitleLength = true,
  validateLowercase = true,
}) {
  const trimmedTitle = (title || '').trim();
  const trimmedBody = (body || '').trim();
  const types = Array.isArray(validTypes)
    ? validTypes
    : String(validTypes || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

  const titlePattern = new RegExp(
    `^(${types.map(escapeRegex).join('|')})(\\([a-zA-Z0-9\\-]+\\))?: .+$`
  );
  const isTitleValid = types.length > 0 && titlePattern.test(trimmedTitle);

  let firstWordLowerCase = true;
  const colonIndex = trimmedTitle.indexOf(':');
  if (colonIndex !== -1) {
    const afterColon = trimmedTitle.substring(colonIndex + 1).trim();
    const firstWord = afterColon.split(/\s+/)[0];
    if (firstWord && firstWord.length > 0) {
      firstWordLowerCase = firstWord[0] === firstWord[0].toLowerCase();
    }
  }

  const isTitleLongEnough = trimmedTitle.length >= minTitleLength;
  const hasDescription = trimmedBody.length > 0;

  const issues = [];
  // Title format is always on
  if (!isTitleValid) issues.push('Invalid conventional commit format');
  if (validateTitleLength && !isTitleLongEnough) {
    issues.push(`Title too short (${trimmedTitle.length}/${minTitleLength} characters)`);
  }
  if (validateLowercase && !firstWordLowerCase) {
    issues.push('First word after colon must start with lowercase');
  }
  if (validateDescription && !hasDescription) {
    issues.push('Description missing');
  }

  const isValid =
    isTitleValid &&
    (!validateTitleLength || isTitleLongEnough) &&
    (!validateDescription || hasDescription) &&
    (!validateLowercase || firstWordLowerCase);

  return {
    isValid,
    issues,
    checks: {
      isTitleValid,
      isTitleLongEnough,
      firstWordLowerCase,
      hasDescription,
      titleLength: trimmedTitle.length,
      minTitleLength,
    },
    validTypes: types,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildCommentBody({
  isValid,
  title,
  checks,
  issues,
  validTypes,
  commentIdentifier,
  descriptionHint,
  examples,
  validateDescription = true,
  validateTitleLength = true,
  validateLowercase = true,
}) {
  const CHECK = ':white_check_mark:';
  const CROSS = ':x:';
  const updated = new Date().toUTCString();

  if (isValid) {
    return `
## ${CHECK} ${commentIdentifier} Passed

Thank you for following Conventional Commits! 🎉

**Current Title:** \`${title}\`
**Title Length:** ${CHECK} ${checks.titleLength} characters
**Description:** ${CHECK} ${checks.hasDescription ? 'Provided' : 'Not required'}
**Status:** ${CHECK} Passed
**Last Updated:** ${updated}
`;
  }

  const exampleLines = String(examples || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((ex) => `- \`${ex}\``)
    .join('\n');

  const titleLengthLine = validateTitleLength
    ? `**Title Length:** ${checks.titleLength}/${checks.minTitleLength} characters ${
        !checks.isTitleLongEnough ? CROSS : CHECK
      }`
    : `**Title Length:** ${checks.titleLength} characters (length check disabled)`;

  const caseLine = validateLowercase
    ? `**First Word After Colon:** ${
        !checks.firstWordLowerCase
          ? `${CROSS} Must start with lowercase`
          : CHECK
      }`
    : '**First Word After Colon:** (case check disabled)';

  const descriptionLine = validateDescription
    ? `**Description:** ${
        checks.hasDescription ? `${CHECK} Provided` : `${CROSS} Missing`
      }
${checks.hasDescription ? '' : descriptionHint}`
    : '**Description:** (description check disabled)';

  return `
## ${CROSS} ${commentIdentifier} Failed

**Issues:**
${issues.map((i) => `- ${i}`).join('\n')}

**Current Title:** \`${title}\`
${titleLengthLine}
${caseLine}
**Required Format:** \`<type>(<optional-scope>): <description>\`
**Valid Types:** ${validTypes.join(', ')}

**Examples (note lowercase first word):**
${exampleLines || '- `feat(scope): add something useful`'}

${descriptionLine}

**Status:** ${CROSS} Failed
**Last Updated:** ${updated}
`;
}

function labelsForFailure(
  checks,
  {
    validateDescription = true,
    validateTitleLength = true,
    validateLowercase = true,
    labels,
  } = {}
) {
  const names = labels || {
    needsFix: 'needs-fix',
    titleFormat: 'needs-title-fix',
    titleLength: 'needs-title-length',
    titleCase: 'needs-title-case',
    description: 'needs-description',
  };

  const result = [names.needsFix];
  if (!checks.isTitleValid) result.push(names.titleFormat);
  if (validateTitleLength && !checks.isTitleLongEnough) result.push(names.titleLength);
  if (validateLowercase && !checks.firstWordLowerCase) result.push(names.titleCase);
  if (validateDescription && !checks.hasDescription) result.push(names.description);
  return result;
}

module.exports = {
  shouldValidate,
  validatePr,
  buildCommentBody,
  labelsForFailure,
};
