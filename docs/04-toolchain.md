# 4. Toolchain: standalone default, Vite+ opt-in

Prev: [3. pnpm](03-pnpm.md) · Next: [5. Testing](05-testing.md) · Index: [book](README.md)

## The two script sets

| Job        | Standalone (default)                             | Vite+ (`vp:*`, opt-in)                                       |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------ |
| Build      | `pnpm build` (`tsc -b`)                          | `pnpm vp:build` (`vp pack` per package, output in `dist-vp`) |
| Lint       | `pnpm lint` = `oxlint --type-aware --type-check` | `pnpm vp:lint`                                               |
| Format     | `pnpm fmt`, `pnpm fmt:check` (Oxfmt)             | `pnpm vp:fmt`, `vp:fmt:check`                                |
| Everything | `pnpm check`                                     | `pnpm vp:check` (fmt + lint + type check in one pass)        |
| Test       | `pnpm test` ([5](05-testing.md))                 | `pnpm vp:test`                                               |
| Config     | `.oxlintrc.json`, `.oxfmtrc.json`                | `vite.config.ts` at the root (the `vp` contract)             |

Both sets run the same Oxlint and Oxfmt engines at the same versions, so results match; the default scripts never read `vite.config.ts`.

## The diff

Measured on the 40-package repo ([7](07-benchmarks.md)), same tool versions:

| Step             | Standalone |   `vp` |
| ---------------- | ---------: | -----: |
| Lint, type-aware |     1.13 s | 1.45 s |
| Format check     |     0.13 s | 0.44 s |
| Tests            |      5.5 s |  5.4 s |
| Pack/build       |      9.2 s | 10.6 s |

`vp` adds about 0.3 s start-up per command because it loads `vite.config.ts`. Install is 84 store entries with `vp` and 67 without. `vp pack` is tsdown (Rolldown + OXC) plus a separate declaration step and does no type check. In-process, with `isolatedDeclarations`, it was about 3 s; `tsc -b` on the same graph took 1.6 s, and the per-package process overhead of `vp run -r` was about 5.5 s of the 11.7 s. Not measured: `vp build`, tsdown workspace mode, watch, coverage.

## Pros and cons of Vite+

Pros: one dependency and one config for lint, format, test, pack and tasks; `vp check` is a convenient single gate; `vp run --cache` gives a task cache (0.72 s on a hit versus 12.4 s cold in the bench).

Cons: lock-in (`vite-plus` imports for tests, `vite` aliased to a VoidZero fork); slower than calling the tools directly; a vendor config file; duplicates what `tsc -b` already does for builds and incremental caching.

## Where to go

- **Default: standalone.** `tsc -b` for builds, Oxlint/Oxfmt/Vitest for the rest. Nothing in production sources imports a vendor module; tests import `vitest`.
- **Reach for `vp`** when you want one entry point for a team that does not want to learn five tools, or you need bundled output: use `vp pack` only for packages that ship a bundle (a CLI, a browser lib), not for the whole graph.
- Do not mix: if you adopt `vp`, keep tests importing `vitest`, not `vite-plus/test`. The demo tests run under both `pnpm test` and `pnpm vp:test` for this reason.

## Why not ESLint and Prettier

Measured scan times were 7.5 s (ESLint no types), 23 s (type-aware), 9.4 s (Prettier) against 0.4 to 2 s for Oxlint and 0.4 s for Oxfmt, but the rule sets differ and ESLint's plugin ecosystem is far larger. If you need a rule Oxlint lacks, run ESLint for that rule only; **to verify** how the two overlap in your codebase.

Next: how tests fit, in [5. Testing](05-testing.md).
