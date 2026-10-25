# TypeScript + pnpm monorepo template

A reusable bootstrap for TypeScript projects. The reasoning, measurements and trade-offs live in the **[docs book](docs/README.md)**.

- **Resolution:** pnpm `workspace:*` symlinks and package.json `exports`. No tsconfig `paths`.
- **Build boundary:** TypeScript project references (`composite`). Dependents read only a dependency's `.d.ts` during `tsc -b`.
- **References are generated**, never hand-edited: `pnpm sync-refs` (CI runs `--check`).

## Commands

| Command                                     | Does                                                         |
| ------------------------------------------- | ------------------------------------------------------------ |
| `pnpm build`                                | sync references, then `tsc -b`                               |
| `pnpm dev`                                  | `tsc -b --watch`                                             |
| `pnpm typecheck`                            | `sync-refs --check`, then `tsc -b` (use in CI)               |
| `pnpm clean`                                | `tsc -b --clean` and remove empty `dist` folders             |
| `pnpm sync-refs`                            | rewrite tsconfig `references` from `workspace:` deps         |
| `pnpm lint` / `pnpm fmt` / `pnpm fmt:check` | Oxlint (type-aware) and Oxfmt                                |
| `pnpm test`                                 | `node --test` on `*.test.ts`, workspace packages from source |
| `pnpm check`                                | format check, lint, typecheck, test-file typecheck, tests    |

Opt-in script sets, not used by the default pipeline: `pnpm vitest:*` ([Vitest](docs/05-testing.md)) and `pnpm vp:*` ([Vite+](docs/04-toolchain.md)).

TypeScript 7 only: `tsc -b --builders N` builds independent projects in parallel, `--checkers N` parallelises checking inside a project.

## Adding a package

1. Create `packages/<name>/` with `package.json` (copy `packages/core`) and a `tsconfig.json` extending `../../tsconfig.base.json`.
2. Add `"@acme/other": "workspace:*"` for each internal dependency, run `pnpm install`, then `pnpm sync-refs`.

## Editor modes

Default (live-source): nothing to configure. The language server reads dependency sources, so go-to-definition and unsaved edits propagate across packages.

Boundary mode: set `"disableSourceOfProjectReferenceRedirect": true` in `tsconfig.base.json` and keep `pnpm dev` running. Editors read only `.d.ts`; go-to-definition still reaches sources through `declarationMap`, but changes show after the watch rebuild.

## Source condition

`exports` lists `@acme/source` first, so runtimes can resolve to `src` with no build:
`node --conditions=@acme/source apps/cli/src/index.ts`. The same condition is set in `customConditions`. Keep the name scoped; a bare `source` can pull other packages' raw sources.

## Rules that keep the boundary honest

- Never hand-edit `references`. A missing reference plus a source condition fails silently.
- `package.json` `exports` is each package's public surface. Do not deep-import `src`.
- The tsconfig files must stay plain JSON (no comments): `sync-refs` rewrites them.

## Benchmarks

`bench/` generates a synthetic monorepo and times the raw pipeline against the `vp` commands and against the conventional tools (ESLint, Prettier, TypeScript 6). Results: [docs/07-benchmarks.md](docs/07-benchmarks.md).

```sh
node bench/gen.mjs /tmp/bench-repo --packages 40 --files 40 --layers 5
pnpm install --ignore-workspace --dir bench/baseline
node bench/run.mjs /tmp/bench-repo --runs 3 --pnpm10 "$(command -v pnpm10)"   # --pnpm10 is optional
```
