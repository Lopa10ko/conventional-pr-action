# Releasing

Follow [GitHub’s tag-based release management for custom actions](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/manage-custom-actions#using-tags-for-release-management). Consumers should pin `@v1` (or a patch like `@v1.0.0`), not `@main`.

## Cut a release

1. Ensure tests and bundle are current:

   ```bash
   npm test
   npm run build
   ```

2. Commit any source changes **and** updated `dist/`.

3. Tag a semantic version and move the major tag to the same commit:

   ```bash
   git tag v1.0.0
   git tag -f v1 v1.0.0
   git push origin main
   git push origin v1.0.0
   git push origin v1 --force
   ```

4. (Recommended) Create a GitHub Release from tag `v1.0.0` with release notes.

5. Consumers reference:

   ```yml
   uses: Lopa10ko/conventional-pr-action@v1
   ```

## Compatibility rules

- **Patch / minor** (`v1.0.x`, `v1.x`): fixes and compatible additions; keep major tag `v1` floating to the latest compatible release.
- **Major** (`v2`): breaking input/behavior changes; introduce a new major tag and leave `v1` on the last v1 release.
