# Benchmark results

Generated monorepo: 40 packages, 1,720 TypeScript files, 5 dependency layers (`node bench/gen.mjs <dir> --packages 40 --files 40 --layers 5`).
Machine: 4 cores, 16 GiB RAM, Linux container, warm pnpm store. Node 24.22.1, pnpm 12.15.0 (and 10.28.0 where stated), TypeScript 7.0.2 (and 6.0.3 where stated), Vite+ 1.4.0.
Median of 3 runs per step. Raw output: the table below, produced by `node bench/run.mjs`.

| Group   | Step                                                | Median (s) | Best (s) | Exit |
| ------- | --------------------------------------------------- | ---------: | -------: | ---: |
| install | pnpm 12 install                                     |       0.12 |     0.12 |    0 |
| install | pnpm 10 install                                     |       0.99 |     0.94 |    0 |
| tsc     | tsc 6.0.3 -b, cold                                  |       8.36 |     7.70 |    0 |
| tsc     | tsc 7.0.2 -b, cold                                  |       2.52 |     2.36 |    0 |
| tsc     | tsc 7.0.2 -b --builders 4, cold                     |       2.69 |     2.62 |    0 |
| tsc     | tsc 7.0.2 -b --builders 4 --checkers 4, cold        |       2.66 |     2.57 |    0 |
| tsc     | tsc 6.0.3 -b, nothing changed                       |       0.32 |     0.31 |    0 |
| tsc     | tsc 6.0.3 -b, body change in a leaf dep             |       0.77 |     0.74 |    0 |
| tsc     | tsc 6.0.3 -b, API change in a leaf dep              |       1.03 |     0.94 |    0 |
| tsc     | tsc 7.0.2 -b, nothing changed                       |       0.11 |     0.10 |    0 |
| tsc     | tsc 7.0.2 -b, body change in a leaf dep             |       0.20 |     0.19 |    0 |
| tsc     | tsc 7.0.2 -b, API change in a leaf dep              |       0.28 |     0.26 |    0 |
| vp      | vp run -r vp:pack (uncached)                        |      12.41 |    12.31 |    0 |
| vp      | vp run -r --cache vp:pack, cache miss               |      14.08 |    13.56 |    0 |
| vp      | vp run -r --cache vp:pack, cache hit                |       0.72 |     0.72 |    0 |
| lint    | eslint 10 (typescript-eslint, no types)             |       7.51 |     7.00 |    0 |
| lint    | eslint 10 (typescript-eslint, type-aware)           |      23.25 |    22.77 |    1 |
| lint    | vp lint (oxlint, no types)                          |       0.39 |     0.39 |    0 |
| lint    | vp lint (oxlint, type-aware + type check)           |       1.99 |     1.94 |    0 |
| fmt     | prettier 3 --check                                  |       9.36 |     8.98 |    1 |
| fmt     | vp fmt --check (oxfmt)                              |       0.42 |     0.39 |    0 |
| test    | node --test (type stripping)                        |       5.32 |     5.26 |    0 |
| test    | vp test (vitest)                                    |       6.53 |     6.42 |    0 |
| check   | pnpm typecheck (sync-refs --check + tsc 7 -b, warm) |       0.23 |     0.19 |    0 |
| check   | vp check (fmt + lint + type check)                  |       2.82 |     2.62 |    0 |

## Reading the numbers

- ESLint and Prettier exit 1 here because they disagree with the generated code's style; they still scan every file, so the timing is a fair scan time but not a clean-pass time. ESLint and Oxlint also run different rule sets.
- `vp lint (type-aware + type check)` includes TypeScript diagnostics through `tsgolint`, which overlaps with `tsc -b`.
- pnpm 12 installs 84 store entries, pnpm 10 installs 89: pnpm 12 skips the musl variants of native packages on this glibc host, so part of its lead is less work, not only speed.
- `vp pack` emits JavaScript and declarations per package and does not replace the type check, so it is compared to `tsc -b` only as a build step.
