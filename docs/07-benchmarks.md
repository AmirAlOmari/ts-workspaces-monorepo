# 7. Benchmarks

Prev: [6. CI](06-ci.md) · Next: [8. Template](08-bootstrap.md) · Index: [book](README.md)

`bench/` generates a synthetic monorepo and times the pipelines. The full table is in [`bench/RESULTS.md`](../bench/RESULTS.md); the findings that shaped decisions are summarised in [2](02-typescript.md) (TS 6 vs 7, caching) and [4](04-toolchain.md) (standalone vs `vp`).

```sh
node bench/gen.mjs /tmp/bench-repo --packages 40 --files 40 --layers 5
pnpm install --ignore-workspace --dir bench/baseline
node bench/run.mjs /tmp/bench-repo --runs 3 --pnpm10 "$(command -v pnpm10)"   # --pnpm10 optional
```

Setup: 40 packages, 1,720 files, 5 dependency layers, 4 cores, 16 GiB, warm store, median of 3.

## Caveats

- ESLint and Prettier exit 1 against generated code; timing is a fair scan time, not a clean-pass time.
- ESLint and Oxlint run different rule sets.
- The standalone variant numbers in [4](04-toolchain.md) and the `node --test` vs Vitest numbers kept in [5](05-testing.md#why-the-node-runner-was-dropped) come from a scratch copy of this repo and are not reproduced by `bench/run.mjs` yet. Adding them is on the [roadmap](09-roadmap.md).
- Synthetic code is lighter than real code; use the shape of the numbers, not the absolute values.
