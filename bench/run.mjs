#!/usr/bin/env node
// Times the raw pnpm + tsc pipeline against the Vite-based (vp) commands on a generated monorepo.
//   node bench/gen.mjs /tmp/bench-repo --packages 40 --files 40 --layers 5
//   pnpm install --ignore-workspace --dir bench/baseline      # ESLint, Prettier, TypeScript 6 baseline
//   node bench/run.mjs /tmp/bench-repo [--runs 3] [--pnpm10 /path/to/pnpm10] [--only install,tsc,vp,lint,fmt,test]
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, totalmem } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [repo, ...rest] = process.argv.slice(2);
if (!repo)
  throw new Error("usage: run.mjs <generated-repo> [--runs N] [--pnpm10 path] [--only a,b]");
const flag = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};
const RUNS = Number(flag("runs") ?? 3);
const PNPM10 = flag("pnpm10");
const only = flag("only")?.split(",");
const baselineBin = join(here, "baseline", "node_modules", ".bin");
const repoBin = join(repo, "node_modules", ".bin");
const hasBaseline = existsSync(join(baselineBin, "eslint"));

const run = (cmd, args, { env = {}, cwd = repo } = {}) => {
  const start = performance.now();
  const r = spawnSync(cmd, args, {
    cwd,
    env: { ...process.env, CI: "1", FORCE_COLOR: "0", ...env },
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 1 << 28,
  });
  return { ms: performance.now() - start, code: r.status, out: `${r.stdout}${r.stderr}` };
};
const sh = (cmd) => run("bash", ["-c", cmd]);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const results = [];

// A step: optional `before` (untimed) and `after` (untimed), then `cmd` timed RUNS times.
function step(group, name, { before, after, cmd, allowFail = false }) {
  if (only && !only.includes(group)) return;
  const times = [];
  let code = 0;
  for (let i = 0; i < RUNS; i++) {
    before?.();
    const r = run(...cmd);
    after?.();
    times.push(r.ms);
    code = r.code;
    if (r.code !== 0 && !allowFail) {
      console.error(`FAILED ${group}/${name} (exit ${r.code})\n${r.out.slice(-1500)}`);
      process.exit(1);
    }
  }
  results.push({ group, name, median: median(times), min: Math.min(...times), code });
  console.error(
    `${group.padEnd(8)} ${name.padEnd(44)} median ${(median(times) / 1000).toFixed(2)}s`,
  );
}

const cleanOutputs = () =>
  sh("rm -rf packages/*/dist packages/*/dist-vp packages/*/tsconfig.tsbuildinfo");
const tsc7 = join(repoBin, "tsc");
const tsc6 = join(baselineBin, "tsc");
const vp = join(repoBin, "vp");
const pnpm12 = "pnpm";

// Edits one module in the first package: a body-only change, or an API change (new export).
const target = join(repo, "packages", "pkg-000", "src", "mod0.ts");
const original = readFileSync(target, "utf8");
const bodyChange = () =>
  writeFileSync(target, original.replace("total += item.value", "total += 1 * item.value"));
const apiChange = () => writeFileSync(target, `${original}\nexport const added = 1;\n`);
const restore = () => writeFileSync(target, original);

// 1. Install, warm store, node_modules removed each time.
const wipeModules = () => sh("rm -rf node_modules packages/*/node_modules");
const installed = (label) => {
  const r = sh(
    "ls node_modules/.pnpm | wc -l; test -x node_modules/.bin/vp && test -x node_modules/.bin/tsc && echo usable",
  );
  console.error(`         ${label}: ${r.out.trim().split("\n").join(", ")} (store entries, state)`);
};
run(pnpm12, ["install"]); // makes sure the lockfile covers the generated packages
run("node", ["scripts/sync-refs.mjs"]);
step("install", "pnpm 12 install", { before: wipeModules, cmd: [pnpm12, ["install"]] });
installed("pnpm 12");
if (PNPM10) {
  step("install", "pnpm 10 install", {
    before: wipeModules,
    cmd: [PNPM10, ["install"], { env: { npm_config_manage_package_manager_versions: "false" } }],
  });
  installed("pnpm 10");
  sh("rm -rf node_modules packages/*/node_modules && pnpm install"); // leave the pnpm 12 layout in place
}

if (!only || only.includes("fmt-prep")) run(vp, ["fmt"]); // generated files must start formatted

// 2. Raw build: tsc -b cold, warm no-op, incremental.
const cold = (name, bin, args) =>
  step("tsc", name, { before: cleanOutputs, cmd: [bin, ["-b", ...args]] });
if (hasBaseline) cold("tsc 6.0.3 -b, cold", tsc6, []);
cold("tsc 7.0.2 -b, cold", tsc7, []);
cold("tsc 7.0.2 -b --builders 4, cold", tsc7, ["--builders", "4"]);
cold("tsc 7.0.2 -b --builders 4 --checkers 4, cold", tsc7, ["--builders", "4", "--checkers", "4"]);

for (const [label, bin] of hasBaseline
  ? [
      ["6.0.3", tsc6],
      ["7.0.2", tsc7],
    ]
  : [["7.0.2", tsc7]]) {
  const warm = () => run(bin, ["-b"]);
  cleanOutputs();
  warm();
  step("tsc", `tsc ${label} -b, nothing changed`, { cmd: [bin, ["-b"]] });
  step("tsc", `tsc ${label} -b, body change in a leaf dep`, {
    before: () => {
      restore();
      warm();
      bodyChange();
    },
    after: restore,
    cmd: [bin, ["-b"]],
  });
  step("tsc", `tsc ${label} -b, API change in a leaf dep`, {
    before: () => {
      restore();
      warm();
      apiChange();
    },
    after: restore,
    cmd: [bin, ["-b"]],
  });
  restore();
}

// 3. Vite+ library build: vp pack in every package, in dependency order.
step("vp", "vp run -r vp:pack (uncached)", {
  before: cleanOutputs,
  cmd: [vp, ["run", "-r", "--no-cache", "vp:pack"]],
});
run(vp, ["cache", "clean"]);
step("vp", "vp run -r --cache vp:pack, cache miss", {
  before: () => {
    cleanOutputs();
    run(vp, ["cache", "clean"]);
  },
  cmd: [vp, ["run", "-r", "--cache", "vp:pack"]],
});
cleanOutputs();
run(vp, ["run", "-r", "--cache", "vp:pack"]);
step("vp", "vp run -r --cache vp:pack, cache hit", {
  cmd: [vp, ["run", "-r", "--cache", "vp:pack"]],
});

// 4. Lint.
const config = join(repo, "vite.config.ts");
const viteConfig = readFileSync(config, "utf8");
const untyped = () =>
  writeFileSync(
    config,
    viteConfig
      .replace("typeAware: true", "typeAware: false")
      .replace("typeCheck: true", "typeCheck: false"),
  );
const typed = () => writeFileSync(config, viteConfig);
if (hasBaseline) {
  const eslint = join(baselineBin, "eslint");
  const cfg = join(here, "baseline", "eslint.config.mjs");
  step("lint", "eslint 10 (typescript-eslint, no types)", {
    cmd: [eslint, ["-c", cfg, "packages"]],
    allowFail: true,
  });
  step("lint", "eslint 10 (typescript-eslint, type-aware)", {
    cmd: [eslint, ["-c", cfg, "packages"], { env: { TYPED: "1" } }],
    allowFail: true,
  });
}
step("lint", "vp lint (oxlint, no types)", {
  before: untyped,
  after: typed,
  cmd: [vp, ["lint"]],
  allowFail: true,
});
step("lint", "vp lint (oxlint, type-aware + type check)", { cmd: [vp, ["lint"]], allowFail: true });

// 5. Format check on the same files.
const globs = ["packages/*/src/**/*.ts", "packages/*/node-tests/**/*.ts"];
if (hasBaseline) {
  step("fmt", "prettier 3 --check", {
    cmd: [join(baselineBin, "prettier"), ["--check", ...globs]],
    allowFail: true,
  });
}
step("fmt", "vp fmt --check (oxfmt)", { cmd: [vp, ["fmt", "--check", ...globs]], allowFail: true });

// 6. Tests: one trivial test file per package, workspace deps resolved from source.
step("test", "node --test (type stripping)", {
  cmd: ["node", ["--conditions=@acme/source", "--test", "packages/*/node-tests/*.test.ts"]],
});
step("test", "vp test (vitest)", { cmd: [vp, ["test"]] });

// 7. Whole-repo checks as a developer or CI would run them.
step("check", "pnpm typecheck (sync-refs --check + tsc 7 -b, warm)", {
  before: () => {
    run(tsc7, ["-b"]);
  },
  cmd: [pnpm12, ["typecheck"]],
});
step("check", "vp check (fmt + lint + type check)", { cmd: [vp, ["check"]] });

console.log(
  `\nMachine: ${cpus().length} cores, ${(totalmem() / 2 ** 30).toFixed(0)} GiB RAM; ${RUNS} runs per step, median shown.\n`,
);
console.log("| Group | Step | Median (s) | Best (s) | Exit |\n| --- | --- | ---: | ---: | ---: |");
for (const r of results) {
  console.log(
    `| ${r.group} | ${r.name} | ${(r.median / 1000).toFixed(2)} | ${(r.min / 1000).toFixed(2)} | ${r.code} |`,
  );
}
writeFileSync(join(repo, "bench-results.json"), JSON.stringify(results, null, 2));
