# Monorepo blueprint book

A reusable starting point for TypeScript projects: pnpm workspaces for linking, TypeScript project references for building, a standalone toolchain on top. This book holds the reasoning and the measurements behind the repo. Each page links to the next one.

| Page                                                                | Read it for                                                                |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [1. Overview and decisions](01-overview.md)                         | The shape of the repo and every decision already made                      |
| [2. TypeScript: references, caching, parallelism](02-typescript.md) | How `tsc -b` works here, TS 6 vs TS 7, editor modes                        |
| [3. pnpm workspaces and resolution](03-pnpm.md)                     | `workspace:*`, `exports`, the source condition, why no `paths`             |
| [4. Toolchain: standalone default, Vite+ opt-in](04-toolchain.md)   | Oxlint, Oxfmt, `tsc -b`, versus `vp`; the diff, pros and cons, where to go |
| [5. Testing: Vitest](05-testing.md)                                 | Which runner when, the pitfalls, why the Node runner was dropped           |
| [6. CI](06-ci.md)                                                   | GitHub Actions and GitLab, caching, what stays untested                    |
| [7. Benchmarks](07-benchmarks.md)                                   | Measured numbers and how to rerun them                                     |
| [8. Using this as a template](08-bootstrap.md)                      | Start a project, add a package, upgrade tools                              |
| [9. Roadmap and open questions](09-roadmap.md)                      | What was not verified, what to add next                                    |
| [10. `tsc -b` versus Nx](10-nx.md)                                  | Task runner and remote cache against project references, measured          |

Conventions: a claim marked **to verify** was reasoned or read from docs, not run here. Everything else was run on the versions in [overview](01-overview.md#versions).
