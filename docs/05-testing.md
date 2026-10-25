# 5. Testing: node --test default, Vitest opt-in

Prev: [4. Toolchain](04-toolchain.md) · Next: [6. CI](06-ci.md) · Index: [book](README.md)

## Scripts

| Script                             | Runs                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                        | `node --conditions=@acme/source --test-force-exit --test "packages/*/src/**/*.test.ts" "apps/*/src/**/*.test.ts"` |
| `pnpm test:watch`                  | same with `--watch`                                                                                               |
| `pnpm typecheck:tests`             | `tsc -p tsconfig.test.json` in each package that has tests                                                        |
| `pnpm vitest:test`, `vitest:watch` | Vitest with `tools/vitest/vitest.config.ts`, files `*.spec.ts`                                                    |
| `pnpm vp:test`                     | the same `*.spec.ts` files through Vite+                                                                          |

Naming keeps the runners apart: `*.test.ts` is `node:test`, `*.spec.ts` is Vitest. Node's default discovery also picks up Vitest files, which is why `pnpm test` passes explicit globs.

## Difference

|                                 | `node --test`                                                                          | Vitest                          |
| ------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------- |
| Install                         | none                                                                                   | `vitest` devDependency          |
| Per-file cost                   | 0.28 s                                                                                 | 1.08 s                          |
| 40 files, 4 cores               | 4.9 s                                                                                  | 6.0 s                           |
| Without isolation               | 0.17 s (`--test-isolation=none`, vs 1.75 s)                                            | 2.2 s (`--no-isolate`)          |
| Runs sources                    | type stripping, so `.ts` imports and erasable syntax only                              | transforms anything Vite can    |
| Workspace imports               | `--conditions=@acme/source`                                                            | `ssr.resolve.conditions`        |
| Module mocks                    | experimental flag `--experimental-test-module-mocks`, must run before the first import | `vi.mock`/`vi.doMock`, hoisted  |
| Snapshots, DOM, fake timers, UI | basic or none                                                                          | built in                        |
| Watch                           | follows the module graph across workspace links                                        | smart re-run, HMR-like          |
| Coverage                        | built in, but never-loaded files are not reported                                      | built in, can include all files |

## Pros and cons

`node --test`: zero dependencies, fastest start, no transform layer, so tests run exactly the code Node runs. Weaker mocking and no DOM environment. Leaked handles (open sockets, timers) hang a test file forever, so `--test-force-exit` is set in the script. This matters in CI.

Vitest: the better tool for module mocks, inline snapshots, DOM, browser mode and a rich watch UI; slower per file and a dependency.

## Where to go

- Pure-Node libraries and apps: **`node --test`** (default).
- A package that needs module mocks, snapshots, DOM or fake-timer ergonomics: **Vitest** for that package. Put its tests in `*.spec.ts`; both runners can live in one repo.
- Use `vitest:test` in CI only if some package actually has `*.spec.ts` files. Today only the demo in `packages/utils` does.

## Demos

`packages/core` and `packages/utils` have `index.test.ts` (node:test). `packages/utils/src/index.spec.ts` shows what only Vitest does cheaply: a module mock of `@acme/core` and an inline snapshot.

## Pitfalls

- Test files import siblings with a `.ts` extension; `allowImportingTsExtensions` is on in `tsconfig.test.json` only.
- `mock.module` restores do not undo consumers that already imported the module.
- Test files are excluded from the build projects, so a type error in a test only shows in `typecheck:tests` or `lint`.
