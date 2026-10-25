# 2. TypeScript: references, caching, parallelism

Prev: [1. Overview](01-overview.md) · Next: [3. pnpm](03-pnpm.md) · Index: [book](README.md)

## Project references

Every package has a `tsconfig.json` with `composite: true` (set in `tsconfig.base.json`), `rootDir: src`, `outDir: dist`, and a `references` list. The root `tsconfig.json` has `files: []` and references every project, so `tsc -b` at the root builds the whole graph in dependency order.

A referenced project is built first; dependents then read its emitted `.d.ts` rather than re-checking its sources. That is the build boundary.

**References are generated.** `scripts/sync-refs.mjs` reads `workspace:` dependencies from each `package.json` and rewrites `references`; `--check` exits 1 on drift (CI uses it through `pnpm typecheck`). A missing reference combined with the source condition fails silently, because the editor finds the source while `tsc -b` does not order the build.

## Incremental caching

`tsc -b` writes `tsconfig.tsbuildinfo` next to each project and skips up-to-date projects. Measured on 40 packages / 1,720 files ([7](07-benchmarks.md)):

| TS    |   cold | nothing changed | body change in a leaf | API change in a leaf |
| ----- | -----: | --------------: | --------------------: | -------------------: |
| 6.0.3 | 8.36 s |          0.32 s |                0.77 s |               1.03 s |
| 7.0.2 | 2.52 s |          0.11 s |                0.20 s |               0.28 s |

A body-only change in a dependency does not rebuild its dependents' output in a meaningful way; an API change does. `dist` and `tsbuildinfo` are one cache unit: restoring either alone is useless (see [6](06-ci.md)).

## Parallelism

TypeScript 7 only: `tsc -b --builders N` builds independent projects in parallel and `--checkers N` parallelises checking inside a project. On this 4-core benchmark neither beat the default (2.52 s vs 2.69 s and 2.66 s), so they are not set. Retest on larger or wider graphs before adopting; the default already uses native speed.

## Editor modes

- **Live-source (default).** The language server follows references to dependency sources, so go-to-definition and unsaved edits propagate across packages.
- **Boundary mode.** Set `"disableSourceOfProjectReferenceRedirect": true` in `tsconfig.base.json` and keep `pnpm dev` running. The editor reads only `.d.ts`; go-to-definition still reaches sources through `declarationMap`, but changes show after the watch rebuild. Use it when an editor slows down on a large graph.

TS 6 language server and VS Code with the TS 7 server: **to verify**.

## Tests and the build

`*.test.ts` and `*.spec.ts` files sit beside sources and are excluded from the build projects (`exclude` in each `tsconfig.json`), so `dist` never contains tests. Each package that has tests gets a `tsconfig.test.json` (`noEmit`, not composite, `allowImportingTsExtensions`, `erasableSyntaxOnly`) checked by `pnpm typecheck:tests`. See [5](05-testing.md).

## Rules that keep the boundary honest

- Never hand-edit `references`.
- `exports` is the public surface; do not deep-import `src`.
- tsconfig files stay plain JSON (no comments) because `sync-refs` rewrites them, and Oxfmt ignores them.
