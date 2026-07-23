# Conventional PR Action

GitHub Action that validates pull request **titles** (and optionally descriptions) against [Conventional Commits](https://www.conventionalcommits.org/), posts a status comment, and manages labels.

Ideal when your team **squash-merges** pull requests: GitHub uses the **PR title** as the default squash commit subject. Checking the title before merge keeps `main` history Conventional-Commits-friendly without enforcing every intermediate commit on the branch.

Packaged as a reusable action in its own repository, following [GitHub’s guidance for managing custom actions](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/manage-custom-actions) (document inputs/outputs, prefer version tags such as `@v1`, do not pin consumers to the default branch).

## Why squash and merge

| Workflow | What becomes the commit on `main` |
| --- | --- |
| Squash and merge | PR title (and optional PR body) |
| Merge commit | Merge commit message |
| Rebase and merge | Individual commits |

With squash and merge, a conventional PR title (`feat(scope): add …`) becomes a conventional commit on the default branch—so this action is a natural gate before merge.

## Usage

Pin a **major version tag** (recommended) or a specific patch tag—not `@main`:

```yml
name: Conventional PR Title and Description

on:
  pull_request:
    types:
      - opened
      - edited

jobs:
  validate-pr:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      issues: write
    steps:
      - name: Validate PR Title and Description
        uses: Lopa10ko/conventional-pr-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

Omitted or empty `with:` values fall back to defaults.

### Permissions and token

| Need | Value |
| --- | --- |
| Permissions | `pull-requests: write`, `issues: write` (for comments and labels) |
| Token | `github_token` input, or `GITHUB_TOKEN` / `GH_TOKEN` env (defaults to `${{ github.token }}`) |

No other secrets are required.

## What it checks

| Check | Toggle | Default |
| --- | --- | --- |
| Title format (`type(scope): …`) | Always on | — |
| Title length | `validate_title_length` | on |
| Lowercase after `:` | `validate_lowercase` | on |
| Non-empty description | `validate_description` | on |

On `pull_request` `edited` events, validation is skipped when only new commits were pushed (title/body unchanged).

## Inputs

Write numbers and booleans unquoted in workflow YAML. Lists are comma-separated strings.

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `github_token` | no | `${{ github.token }}` | Token with PR/issue write access |
| `min_title_length` | no | `30` | Minimum title length (number) |
| `valid_types` | no | `feat,fix,docs,style,refactor,perf,test,chore,build,ci,revert,release` | Comma-separated types |
| `validate_description` | no | `true` | Require non-empty PR body |
| `validate_title_length` | no | `true` | Enforce `min_title_length` |
| `validate_lowercase` | no | `true` | Require lowercase first word after `:` |
| `skip_on_commit_push` | no | `true` | Skip when edit is commit-only |
| `comment_identifier` | no | `PR Title Validation` | Marker used to upsert the bot comment |
| `fail_on_error` | no | `true` | Fail the job when validation fails |
| `description_hint` | no | `Please provide a description of your changes.` | Shown when body is missing |
| `examples` | no | (see `action.yml`) | Newline-separated example titles on failure |
| `post_comment` | no | `true` | Post/update validation comment |
| `manage_labels` | no | `true` | Add/remove needs-* labels |
| `label_needs_fix` | no | `needs-fix` | Override label names |
| `label_needs_title_fix` | no | `needs-title-fix` | |
| `label_needs_title_length` | no | `needs-title-length` | |
| `label_needs_title_case` | no | `needs-title-case` | |
| `label_needs_description` | no | `needs-description` | |

## Outputs

| Output | Description |
| --- | --- |
| `valid` | `true` / `false` |
| `skipped` | `true` when validation was skipped |
| `issues` | Comma-separated failure reasons |

## Labels

On failure (when `manage_labels` is on): `needs-fix`, `needs-title-fix`, `needs-title-length`, `needs-title-case`, `needs-description`. On success those labels are removed.

## Example with customization

```yml
- name: Validate PR Title and Description
  uses: Lopa10ko/conventional-pr-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    min_title_length: 40
    validate_description: true
    validate_title_length: true
    validate_lowercase: false
    valid_types: feat,fix,docs,chore
    description_hint: Describe your ML changes.
    post_comment: true
    manage_labels: true
```

Title format cannot be disabled. Turn off optional checks with `validate_description: false`, `validate_title_length: false`, or `validate_lowercase: false`.

## Versioning

Per [GitHub’s tag-based release management](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/manage-custom-actions#using-tags-for-release-management):

```yml
uses: Lopa10ko/conventional-pr-action@v1      # major (recommended)
uses: Lopa10ko/conventional-pr-action@v1.0.0 # exact patch
```

See [RELEASE.md](RELEASE.md) for how maintainers cut releases.

## Compatibility

Uses [`@actions/github`](https://github.com/actions/toolkit/tree/main/packages/github) so API URLs come from the runner environment (`GITHUB_API_URL`), including GitHub Enterprise—no hardcoded `https://api.github.com`.

## Development

```bash
npm install
npm test
npm run build
```

`dist/` is the bundled entrypoint referenced by `action.yml` (`runs.using: node20`). Commit updated `dist/` before tagging a release.

## License

[BSD 3-Clause](LICENSE) © 2026 Georgii Lopatenko
