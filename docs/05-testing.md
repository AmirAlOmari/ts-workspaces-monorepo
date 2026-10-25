# 5. Testing: Vitest

Prev: [4. Toolchain](04-toolchain.md) · Next: [6. CI](06-ci.md) · Index: [book](README.md)

**Vitest is the only test runner.** Node's built-in runner (`node --test`) was evaluated, used in an earlier revision, and dropped; the record is at the bottom of this page.

## Scripts

| Script                 | Runs                                                                        |
| ---------------------- | --------------------------------------------------------------------------- |
| `pnpm test`            | `vitest run`, config in the root `vitest.config.ts`                         |
| `pnpm test:watch`      | `vitest` in watch mode                                                      |
| `pnpm typecheck:tests` | `tsc -p tsconfig.test.json` in each package that has tests                  |
| `pnpm vp:test`         | the same `*.test.ts` files through Vite+ (opt-in, see [4](04-toolchain.md)) |

Tests are `*.test.ts` files beside the sources, matched by `{packages,apps}/*/src/**/*.test.ts`. They are excluded from the build projects, so `dist` never contains them.

## Configuration

`vitest.config.ts` has one non-default setting: `ssr.resolve.conditions: ["@acme/source"]`. It makes `@acme/*` imports resolve to sources through `exports` (see [3](03-pnpm.md#resolution-without-paths)), so tests need no build step. A plain `resolve.conditions` is not enough for the test runner.

Tests import `vitest`, never `vite-plus/test`, so the same files run under `pnpm test` and `pnpm vp:test`. Test files import siblings with a `.ts` extension; `tsconfig.test.json` enables `allowImportingTsExtensions` for that.

## Demos

`packages/core/src/index.test.ts` is the minimal case. `packages/utils/src/index.test.ts` also shows a workspace-dependency module mock (`vi.doMock("@acme/core", ...)`) and an inline snapshot.

## Pitfalls

- A type error in a test shows only in `typecheck:tests` or `lint`, because tests are outside the build projects.
- Module mocks must be registered before the first import of the mocked module; `vi.resetModules()` and a dynamic `import()` do that in the demo.
- Vitest transforms sources, so code that passes in tests can still fail under plain Node. `node --conditions=@acme/source apps/cli/src/index.ts` (run in CI) covers the Node path for the CLI.

## Why the Node runner was dropped

The decision was Amir's (2026-10-25). The measurements below were taken before it and remain true; they show the price paid.

|                             | `node --test`                                          | Vitest                      |
| --------------------------- | ------------------------------------------------------ | --------------------------- |
| Install                     | none                                                   | `vitest` devDependency      |
| Per-file cost               | 0.28 s                                                 | 1.08 s                      |
| 40 files, 4 cores           | 4.9 s                                                  | 6.0 s                       |
| Without isolation           | 0.17 s (`--test-isolation=none`, vs 1.75 s)            | 2.2 s (`--no-isolate`)      |
| Runs sources                | type stripping: `.ts` imports and erasable syntax only | anything Vite can transform |
| Module mocks                | experimental flag, must run before first import        | `vi.mock` / `vi.doMock`     |
| Snapshots, DOM, fake timers | basic or none                                          | built in                    |
| Coverage                    | never-loaded files are not reported                    | can include all files       |

What `node --test` did well: zero dependencies, fastest start, and tests ran exactly the code Node runs. Its sharp edges: leaked handles hang a test file forever unless `--test-force-exit` is set, `--conditions` must be passed explicitly, and default discovery also picks up Vitest files.

Rationale for one runner: a single mock/snapshot/watch story across all packages, and no split between `*.test.ts` and `*.spec.ts` conventions. The cost is a transform layer and slower start-up; if a pure-Node package ever needs the other trade, `node --test` can come back for that package alone, using the settings above.
