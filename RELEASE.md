# Releasing

1. Ensure tests and bundle are current:

   ```bash
   npm test
   npm run build
   ```

2. Commit any source changes and updated `dist/`.

3. Create a GitHub Release from the repository UI (or tag manually). Consumers can then use:

   ```yml
   uses: Lopa10ko/conventional-pr-action@v1
   ```
