# Nx head-to-head results

`node bench/nx/run.mjs <generated-repo>`; setup and caveats in [docs/10-nx.md](../docs/10-nx.md).
Generated monorepo: 40 packages, 1,720 TypeScript files, 5 layers. Nx 24.0.1, TypeScript 7.0.2, pnpm 12.15.0, **Node 22.22.0** (the sandbox; the template targets Node 24), 4 cores, 16 GiB, `--parallel=4`, Nx daemon on unless stated. Median of 3.

Nx input strategies: `src` = default (a dependency's source files feed a dependent's hash); `dts` = a dependency's emitted `.d.ts` feeds the hash, direct dependencies only; `dts-transitive` = same, all upstream projects.

| Group | Step                                                       | Median (s) | Best (s) | Nx cache  |
| ----- | ---------------------------------------------------------- | ---------: | -------: | --------- |
| tsc   | tsc -b, cold                                               |       2.30 |     2.15 |           |
| tsc   | tsc -b, nothing changed                                    |       0.09 |     0.08 |           |
| tsc   | tsc -b, body change in pkg-000 (bottom of DAG)             |       0.19 |     0.17 |           |
| tsc   | tsc -b, API change in pkg-000 (bottom of DAG)              |       0.24 |     0.21 |           |
| tsc   | tsc -b, body change in pkg-039 (top of DAG)                |       0.19 |     0.19 |           |
| tsc   | tsc -b, fresh checkout + restored dist/tsbuildinfo         |       0.12 |     0.11 |           |
| nx    | nx[src], cold, no cache                                    |       6.00 |     5.88 |           |
| nx    | nx[src], nothing changed (daemon)                          |       0.60 |     0.55 | 40/40 hit |
| nx    | nx[src], nothing changed (no daemon)                       |       3.57 |     3.08 | 40/40 hit |
| nx    | nx[src], outputs wiped, local cache restore                |       3.55 |     3.16 | 40/40 hit |
| nx    | nx[src], body change in pkg-000 (bottom of DAG)            |       3.34 |     2.91 | 25/40 hit |
| nx    | nx[src], API change in pkg-000 (bottom of DAG)             |       3.09 |     3.01 | 25/40 hit |
| nx    | nx[src], body change in pkg-039 (top of DAG)               |       1.01 |     0.91 | 39/40 hit |
| nx    | nx[dts], cold, no cache                                    |       6.49 |     6.34 |           |
| nx    | nx[dts], nothing changed (daemon)                          |       0.63 |     0.60 | 40/40 hit |
| nx    | nx[dts], nothing changed (no daemon)                       |       4.05 |     3.93 | 40/40 hit |
| nx    | nx[dts], outputs wiped, local cache restore                |       3.30 |     3.21 | 40/40 hit |
| nx    | nx[dts], body change in pkg-000 (bottom of DAG)            |       1.10 |     1.10 | 39/40 hit |
| nx    | nx[dts], API change in pkg-000 (bottom of DAG)             |       1.45 |     1.32 | 37/40 hit |
| nx    | nx[dts], body change in pkg-039 (top of DAG)               |       0.99 |     0.99 | 39/40 hit |
| nx    | nx[dts-transitive], cold, no cache                         |       6.74 |     6.34 |           |
| nx    | nx[dts-transitive], nothing changed (daemon)               |       0.75 |     0.71 | 40/40 hit |
| nx    | nx[dts-transitive], nothing changed (no daemon)            |       4.44 |     4.16 | 40/40 hit |
| nx    | nx[dts-transitive], outputs wiped, local cache restore     |       4.57 |     3.74 | 40/40 hit |
| nx    | nx[dts-transitive], body change in pkg-000 (bottom of DAG) |       1.28 |     1.25 | 39/40 hit |
| nx    | nx[dts-transitive], API change in pkg-000 (bottom of DAG)  |       2.72 |     2.30 | 25/40 hit |
| nx    | nx[dts-transitive], body change in pkg-039 (top of DAG)    |       1.12 |     1.10 | 39/40 hit |

## Remote cache (self-hosted, OpenAPI contract), run by hand

Clone A builds cold and uploads 40 entries (612 KB). Clone B is a copy of the repo with no `dist`, no `.nx`, in a different directory, and `NX_DAEMON=false CI=1`. Server: `bench/nx/cache-server.mjs` on localhost, so network latency is zero.

| Step                              |         Wall (s) | Nx cache |
| --------------------------------- | ---------------: | -------- |
| Clone B, 3 runs (all remote hits) | 2.86, 3.36, 3.91 | 40/40    |
| `tsc -b`, cold, same clone        |             1.91 | n/a      |
| Remote cache URL unreachable      |       hard error | n/a      |
