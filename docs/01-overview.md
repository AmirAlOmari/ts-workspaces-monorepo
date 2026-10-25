# 1. Overview and decisions

Next: [2. TypeScript](02-typescript.md) · Index: [book](README.md)

## Shape

```
apps/cli            consumer, builds to dist
packages/core       leaf library
packages/utils      depends on core via workspace:*
scripts/            sync-refs, clean, workspace helpers (plain Node, no dependencies)
vitest.config.ts   test runner config
vite.config.ts     opt-in Vite+ config (read only by vp:* scripts)
bench/              synthetic-monorepo generator and timing harness
docs/               this book
```

Three layers, each with one job:

1. **pnpm** links packages (`workspace:*`) and orders installs. See [3](03-pnpm.md).
2. **TypeScript project references** define the build graph and the incremental cache. See [2](02-typescript.md).
3. **Tools** (format, lint, test) run on top and never change how packages resolve each other. See [4](04-toolchain.md) and [5](05-testing.md).

## Decisions made

| Decision                                                                                         | Why                                                                                           |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Resolve siblings through `workspace:*` plus `exports`, no tsconfig `paths`                       | One mechanism for tsc, Node, and bundlers                                                     |
| `composite` project references as the build boundary                                             | Incremental builds, and dependents read only `.d.ts`                                          |
| References generated from `package.json` deps by `pnpm sync-refs`; CI runs `--check`             | Hand-edited references drift silently                                                         |
| Live-source editor mode by default; boundary mode opt-in                                         | Edits propagate across packages without a watch build. See [2](02-typescript.md#editor-modes) |
| Support TypeScript 6.x and 7                                                                     | CI matrix runs both                                                                           |
| **Standalone tools are the default** (Oxlint, Oxfmt, Vitest); **`vp:*` is an opt-in script set** | Less lock-in, same speed, tests do not import a vendor module. See [4](04-toolchain.md)       |
| **Vitest is the only test runner**; `node --test` was dropped                                    | One mock/snapshot/watch story. See [5](05-testing.md#why-the-node-runner-was-dropped)         |
| Raw `pnpm` + `tsc -b` always works, with none of the opt-in tools                                | The reference pipeline                                                                        |
| Private self-hosted GitLab is the CI target; GitHub Actions is the stand-in                      | GitLab files are kept and must not be removed                                                 |

## Versions

Node 24 (`.nvmrc`, `engines`), pnpm 12.15.0 (`packageManager`), TypeScript 7.0.2 with 6.0.3 in the CI matrix, Oxlint 1.89.0, oxlint-tsgolint 7.0.2005, Oxfmt 0.74.0, Vitest 5.0.5, Vite+ 1.4.0. Versions are pinned exactly; upgrade them on purpose, see [8](08-bootstrap.md#upgrading).

## Command map

| Default (standalone)                                   | Opt-in                                   |
| ------------------------------------------------------ | ---------------------------------------- |
| `pnpm build`, `dev`, `typecheck`, `clean`, `sync-refs` |                                          |
| `pnpm lint`, `fmt`, `fmt:check`                        | `pnpm vp:lint`, `vp:fmt`, `vp:fmt:check` |
| `pnpm test`, `test:watch`, `typecheck:tests`           | `pnpm vp:test`                           |
| `pnpm check` (all of the above in order)               | `pnpm vp:check`, `vp:build`              |
