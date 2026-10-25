#!/usr/bin/env node
// Head to head: `tsc -b` against Nx task caching on a generated monorepo (bench/gen.mjs).
//   node bench/gen.mjs /tmp/bench-repo --packages 40 --files 40 --layers 5
//   pnpm -C /tmp/bench-repo add -Dw nx@24.0.1
//   node bench/nx/run.mjs /tmp/bench-repo [--runs 3]
// Nx input strategies compared: src (default: dependency sources feed the hash),
// dts (dependency .d.ts feeds the hash, direct only), dts-transitive.
import { spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdtempSync,
  utimesSync,
  readdirSync,
} from "node:fs";
import { tmpdir, cpus, totalmem } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [repo, ...rest] = process.argv.slice(2);
if (!repo) throw new Error("usage: run.mjs <generated-repo> [--runs N]");
const RUNS = Number(rest[rest.indexOf("--runs") + 1] || 3);
const bin = join(repo, "node_modules", ".bin");
const env = {
  ...process.env,
  CI: "1",
  NX_DAEMON: "true",
  FORCE_COLOR: "0",
  PATH: `${bin}:${process.env.PATH}`,
};

const sh = (cmd, cwd = repo, e = {}) => {
  const t = performance.now();
  const r = spawnSync("bash", ["-c", cmd], {
    cwd,
    env: { ...env, ...e },
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  return { ms: performance.now() - t, code: r.status, out: `${r.stdout}${r.stderr}` };
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const rows = [];
function measure(group, name, { before, cmd, after, cwd, e }) {
  const times = [];
  let info = "";
  for (let i = 0; i < RUNS; i++) {
    before?.();
    const r = sh(cmd, cwd, e);
    if (r.code !== 0) {
      console.error(`FAILED ${group}/${name}\n${r.out.slice(-1500)}`);
      process.exit(1);
    }
    times.push(r.ms);
    info = (/Cache:\s+(\d+\/\d+ hit)/.exec(r.out) ?? [])[1] ?? "";
    after?.();
  }
  rows.push({ group, name, median: median(times), best: Math.min(...times), info });
  console.error(
    `${group.padEnd(8)} ${name.padEnd(52)} ${(median(times) / 1000).toFixed(2)}s ${info}`,
  );
}

const wipe = (dir = repo) => sh("rm -rf packages/*/dist packages/*/tsconfig.tsbuildinfo", dir);
const mod = (n, i = 0) =>
  join(repo, "packages", `pkg-${String(n).padStart(3, "0")}`, "src", `mod${i}.ts`);
const edits = {
  "body change in pkg-000 (bottom of DAG)": [
    mod(0),
    (s) => s.replace("total += item.value", "total += 1 * item.value"),
  ],
  "API change in pkg-000 (bottom of DAG)": [mod(0), (s) => `${s}\nexport const added = 1;\n`],
  "body change in pkg-039 (top of DAG)": [
    mod(39),
    (s) => s.replace("total += item.value", "total += 1 * item.value"),
  ],
};
const NX = "nx run-many -t build --parallel=4";

// tsc -b
const tscBuild = "tsc -b";
const tsc = (name, scenario) =>
  scenario(
    name,
    tscBuild,
    () => {},
    () => {},
  );
const warmTsc = () => {
  wipe();
  sh(tscBuild);
};
measure("tsc", "tsc -b, cold", { before: wipe, cmd: tscBuild });
warmTsc();
measure("tsc", "tsc -b, nothing changed", { cmd: tscBuild });
for (const [label, [file, fn]] of Object.entries(edits)) {
  const original = readFileSync(file, "utf8");
  measure("tsc", `tsc -b, ${label}`, {
    before: () => {
      writeFileSync(file, original);
      warmTsc();
      writeFileSync(file, fn(original));
    },
    after: () => writeFileSync(file, original),
    cmd: tscBuild,
  });
}

// fresh checkout with restored dist + tsbuildinfo (what a CI cache of tsc -b output would give)
{
  warmTsc();
  const clone = mkdtempSync(join(tmpdir(), "tsc-ci-"));
  cpSync(repo, clone, {
    recursive: true,
    filter: (p) => !p.includes("/dist") && !p.endsWith(".tsbuildinfo"),
  });
  sh(
    `for d in packages/*; do cp -r ${repo}/$d/dist $d/dist; cp ${repo}/$d/tsconfig.tsbuildinfo $d/; done`,
    clone,
  );
  const future = new Date(Date.now() + 5000); // sources look newer than restored outputs, like a fresh clone
  for (const f of sh("ls packages/*/src/*.ts", clone).out.trim().split("\n"))
    utimesSync(join(clone, f), future, future);
  measure("tsc", "tsc -b, fresh checkout + restored dist/tsbuildinfo", {
    cmd: tscBuild,
    cwd: clone,
    before: () => {},
  });
  rmSync(clone, { recursive: true, force: true });
}

// Nx variants
for (const [variant, flag] of [
  ["src", ""],
  ["dts", "--dts-inputs"],
  ["dts-transitive", "--dts-inputs --transitive"],
]) {
  const set = () => {
    sh(`node ${join(here, "setup.mjs")} . ${flag}`, repo);
    sh("nx reset", repo);
  };
  set();
  const label = `nx[${variant}]`;
  const coldReset = () => {
    sh("nx reset");
    wipe();
  };
  measure("nx", `${label}, cold, no cache`, { before: coldReset, cmd: `${NX} --skipNxCache` });
  const warmNx = () => {
    sh("nx reset");
    wipe();
    sh(NX);
  };
  warmNx();
  measure("nx", `${label}, nothing changed (daemon)`, { cmd: NX });
  measure("nx", `${label}, nothing changed (no daemon)`, { cmd: NX, e: { NX_DAEMON: "false" } });
  measure("nx", `${label}, outputs wiped, local cache restore`, { before: wipe, cmd: NX });
  for (const [what, [file, fn]] of Object.entries(edits)) {
    const original = readFileSync(file, "utf8");
    measure("nx", `${label}, ${what}`, {
      before: () => {
        writeFileSync(file, original);
        warmNx();
        writeFileSync(file, fn(original));
      },
      after: () => writeFileSync(file, original),
      cmd: NX,
    });
  }
}
sh("nx reset");

console.log(
  `\nMachine: ${cpus().length} cores, ${(totalmem() / 2 ** 30).toFixed(0)} GiB RAM; ${RUNS} runs, median.\n`,
);
console.log(
  "| Group | Step | Median (s) | Best (s) | Nx cache |\n| --- | --- | ---: | ---: | --- |",
);
for (const r of rows)
  console.log(
    `| ${r.group} | ${r.name} | ${(r.median / 1000).toFixed(2)} | ${(r.best / 1000).toFixed(2)} | ${r.info} |`,
  );
