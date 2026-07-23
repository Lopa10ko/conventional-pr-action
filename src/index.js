'use strict';

const core = require('@actions/core');
const github = require('@actions/github');
const { loadConfig, allLabelNames } = require('./config');
const {
  shouldValidate,
  validatePr,
  buildCommentBody,
  labelsForFailure,
} = require('./validate');

async function upsertComment({ octokit, owner, repo, issueNumber, body, commentIdentifier }) {
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
  });

  const botComment = comments.find(
    (c) => c.user && c.user.type === 'Bot' && c.body && c.body.includes(commentIdentifier)
  );

  if (botComment) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: botComment.id,
      body,
    });
    core.info(`Updated existing ${commentIdentifier} comment`);
    return;
  }

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
  core.info(`Created new ${commentIdentifier} comment`);
}

async function addLabels({ octokit, owner, repo, issueNumber, labels }) {
  for (const label of labels) {
    try {
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels: [label],
      });
    } catch (error) {
      core.debug(`Could not add label ${label}: ${error.message}`);
    }
  }
}

async function removeLabels({ octokit, owner, repo, issueNumber, labels }) {
  for (const label of labels) {
    try {
      await octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: issueNumber,
        name: label,
      });
    } catch (error) {
      core.debug(`Could not remove label ${label}: ${error.message}`);
    }
  }
}

async function run() {
  const config = loadConfig();

  if (!config.githubToken) {
    core.setFailed('github_token is required (or set GITHUB_TOKEN)');
    return;
  }

  const { context } = github;
  const pr = context.payload.pull_request;

  if (!pr) {
    core.setFailed('This action only works on pull_request events');
    return;
  }

  const decision = shouldValidate(context.payload, {
    skipOnCommitPush: config.skipOnCommitPush,
  });
  core.info(decision.reason);

  if (!decision.shouldValidate) {
    core.setOutput('skipped', 'true');
    core.setOutput('valid', 'true');
    core.setOutput('issues', '');
    return;
  }

  core.setOutput('skipped', 'false');

  const result = validatePr({
    title: pr.title,
    body: pr.body || '',
    validTypes: config.validTypes,
    minTitleLength: config.minTitleLength,
    validateDescription: config.validateDescription,
    validateTitleLength: config.validateTitleLength,
    validateLowercase: config.validateLowercase,
  });

  const commentBody = buildCommentBody({
    isValid: result.isValid,
    title: pr.title,
    checks: result.checks,
    issues: result.issues,
    validTypes: result.validTypes,
    commentIdentifier: config.commentIdentifier,
    descriptionHint: config.descriptionHint,
    examples: config.examples,
    validateDescription: config.validateDescription,
    validateTitleLength: config.validateTitleLength,
    validateLowercase: config.validateLowercase,
  });

  const octokit = github.getOctokit(config.githubToken);
  const { owner, repo } = context.repo;

  if (config.postComment) {
    await upsertComment({
      octokit,
      owner,
      repo,
      issueNumber: pr.number,
      body: commentBody,
      commentIdentifier: config.commentIdentifier,
    });
  }

  if (!result.isValid) {
    if (config.manageLabels) {
      const labels = labelsForFailure(result.checks, {
        validateDescription: config.validateDescription,
        validateTitleLength: config.validateTitleLength,
        validateLowercase: config.validateLowercase,
        labels: config.labels,
      });
      await addLabels({ octokit, owner, repo, issueNumber: pr.number, labels });
    }
    core.setOutput('valid', 'false');
    core.setOutput('issues', result.issues.join(', '));
    if (config.failOnError) {
      core.setFailed(`PR validation failed: ${result.issues.join(', ')}`);
    } else {
      core.warning(`PR validation failed: ${result.issues.join(', ')}`);
    }
    return;
  }

  if (config.manageLabels) {
    await removeLabels({
      octokit,
      owner,
      repo,
      issueNumber: pr.number,
      labels: allLabelNames(config.labels),
    });
  }

  core.setOutput('valid', 'true');
  core.setOutput('issues', '');
  core.info('PR Title Validation Passed');
}

run().catch((error) => {
  core.setFailed(error.message || String(error));
});
