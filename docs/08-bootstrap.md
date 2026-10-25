# 8. Using this as a template

Prev: [7. Benchmarks](07-benchmarks.md) · Next: [9. Roadmap](09-roadmap.md) · Index: [book](README.md)

## Start a project

1. Copy or template the repo. Rename the `@acme` scope everywhere: package names, `exports` conditions (`@acme/source`), `customConditions`, the `test` script flag, `vitest.config.ts`, `vite.config.ts`.
2. Delete the demo packages when you no longer need them, or keep `core`/`utils` as shape references.
3. Remove what you do not use, each independently:
   - Vite+: delete `vite.config.ts`, the `vp:*` scripts, the `vp:pack` scripts in packages, the `vite-plus` devDependency, and the `vite-poc` CI job.
   - Vitest: delete `tools/vitest`, `*.spec.ts`, the `vitest:*` scripts, the `vitest` devDependency, and the CI job.
4. `pnpm install`, then `pnpm check`.

## Add a package

1. Create `packages/<name>/` with `package.json` (copy `packages/core`) and a `tsconfig.json` extending `../../tsconfig.base.json`.
2. Declare internal dependencies as `workspace:*`, run `pnpm install`, then `pnpm sync-refs`.
3. If it has tests, add `tsconfig.test.json` (copy `packages/core`) and a `typecheck:tests` script.

## Upgrading

- Pins are exact. Bump them together, then run `pnpm check` and the CI matrix.
- TypeScript: change `typescript` at the root; the CI matrix still tests both lines.
- Oxlint and `oxlint-tsgolint` are paired; upgrade them together and confirm the type-aware run still passes.
- Node: `.nvmrc`, `engines`, and the GitLab image.
- pnpm: `packageManager` only.

## Things to keep true

- `pnpm build` and `pnpm test` work with Vite+ and Vitest uninstalled in spirit: nothing in default sources imports them.
- Default tests import `node:test`; opt-in tests import `vitest`.
