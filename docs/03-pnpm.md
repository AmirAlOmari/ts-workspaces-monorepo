# 3. pnpm workspaces and resolution

Prev: [2. TypeScript](02-typescript.md) · Next: [4. Toolchain](04-toolchain.md) · Index: [book](README.md)

## Workspace

`pnpm-workspace.yaml` lists `packages/*` and `apps/*`. An internal dependency is written `"@acme/core": "workspace:*"`; pnpm symlinks it into the dependant's `node_modules`. Both `scripts/workspace.mjs` and `sync-refs` read the same globs, and the helper supports only `dir/*` and plain `dir` patterns.

pnpm 12 is pinned via `packageManager` (CI uses `pnpm/action-setup`, GitLab uses `corepack enable`). Installing is fast in the benchmark (0.12 s warm vs 0.99 s on pnpm 10), though part of that lead is skipped musl binaries on a glibc host.

## Resolution without `paths`

A sibling import (`import { add } from "@acme/core"`) resolves like any dependency: symlink, then the package's `exports`. The same lookup serves `tsc`, Node, Vite and test runners, so there is no second alias table to keep in sync.

```json
"exports": {
  ".": {
    "@acme/source": "./src/index.ts",
    "types":        "./dist/index.d.ts",
    "default":      "./dist/index.js"
  }
}
```

The **source condition** `@acme/source` comes first:

- Editors and `tsc` get it from `customConditions` in the base config.
- Node uses `--conditions=@acme/source` and runs sources directly with type stripping, no build. `pnpm test` relies on this, and the flag is inherited by child processes.
- Vite and Vitest need `ssr.resolve.conditions: ["@acme/source"]`; a plain `resolve.conditions` is not enough for the test runner.

Keep the name scoped. A bare `source` can pull other packages' raw sources out of `node_modules`.

## Source files Node can run

Node's type stripping needs explicit `.ts` extensions on relative imports and erasable-only syntax (no enums, namespaces, parameter properties). Test files follow this (`import ... from "./index.ts"`, enforced by `erasableSyntaxOnly` in `tsconfig.test.json`). Production sources that only consume packages by name need no extension. If a package starts using relative imports, add `rewriteRelativeImportExtensions` so `tsc` emits `.js`. This was reasoned, **to verify during implementation** for production sources.

## Adding a dependency

`pnpm add --filter @acme/utils @acme/core --workspace`, then `pnpm sync-refs`. Forgetting the second step fails `pnpm typecheck` in CI, as intended.
