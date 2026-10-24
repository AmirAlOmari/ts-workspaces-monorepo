# TypeScript + pnpm monorepo template

- **Resolution:** pnpm `workspace:*` symlinks and package.json `exports`. No tsconfig `paths`.
- **Build boundary:** TypeScript project references (`composite`). Dependents read only a dependency's `.d.ts` during `tsc -b`.
- **References are generated**, never hand-edited: `pnpm sync-refs` (CI runs `--check`).

## Commands

| Command | Does |
| --- | --- |
| `pnpm build` | sync references, then `tsc -b` |
| `pnpm dev` | `tsc -b --watch` |
| `pnpm typecheck` | `sync-refs --check`, then `tsc -b` (use in CI) |
| `pnpm clean` | `tsc -b --clean` and remove empty `dist` folders |
| `pnpm sync-refs` | rewrite tsconfig `references` from `workspace:` deps |

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
