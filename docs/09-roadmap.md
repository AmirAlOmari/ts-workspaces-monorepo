# 9. Roadmap and open questions

Prev: [8. Template](08-bootstrap.md) · Index: [book](README.md)

## Not verified yet

- GitLab CI on a real instance: caches, artifacts, `parallel: matrix` for TS 6.
- GitHub Actions cross-run cache restore.
- TS 6 language server and VS Code with the TS 7 server.
- `rewriteRelativeImportExtensions` for production sources that use relative imports ([3](03-pnpm.md#source-files-node-can-run)).
- `tsc -b --builders`/`--checkers` on wider graphs than the 4-core benchmark.
- Overlap between Oxlint and ESLint rules if a rule is missing.

## Ideas to add

- Fold the standalone and test-runner measurements into `bench/run.mjs` ([7](07-benchmarks.md)).
- Coverage with Vitest.
- Package publishing (changesets or similar) and bundling for libraries that ship.
- A second, non-library demo app (HTTP service) and a browser demo for Vitest DOM mode.
- Task caching beyond `tsc -b` (remote cache) if the graph grows.
- Pre-commit hook running `pnpm fmt:check` and `pnpm lint`.

Return to the [index](README.md).
