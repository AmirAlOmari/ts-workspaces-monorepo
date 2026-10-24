#!/usr/bin/env node
// Generates tsconfig `references` from package.json `workspace:` dependencies.
//   node scripts/sync-refs.mjs          rewrite tsconfig files
//   node scripts/sync-refs.mjs --check  exit 1 if any file would change (for CI)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, posix, sep } from "node:path";
import { root, listWorkspaceDirs } from "./workspace.mjs";

const check = process.argv.includes("--check");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const DEP_FIELDS = ["dependencies", "devDependencies", "optionalDependencies"];

const packages = new Map(); // name -> { dir, deps: string[] }
for (const dir of listWorkspaceDirs()) {
  const pkg = readJson(join(dir, "package.json"));
  const deps = DEP_FIELDS.flatMap((f) => Object.entries(pkg[f] ?? {}))
    .filter(([, range]) => String(range).startsWith("workspace:"))
    .map(([name]) => name);
  packages.set(pkg.name, { dir, deps: [...new Set(deps)] });
}

const errors = [];
const toPosix = (p) => p.split(sep).join(posix.sep);
const changes = [];

// Keep arrays of plain strings on one line, e.g. "include": ["src"].
const format = (json) =>
  JSON.stringify(json, null, 2).replace(/\[\s+((?:"[^"\n]*",?\s+)*"[^"\n]*")\s+\]/g, (_, items) => `[${items.replace(/\s*\n\s*/g, " ")}]`) + "\n";

function writeIfChanged(file, json) {
  const next = format(json);
  const prev = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (prev === next) return;
  changes.push(relative(root, file));
  if (!check) writeFileSync(file, next);
}

for (const [name, { dir, deps }] of packages) {
  const tsconfigPath = join(dir, "tsconfig.json");
  if (!existsSync(tsconfigPath)) {
    if (deps.length) errors.push(`${name} has workspace deps but no tsconfig.json`);
    continue;
  }
  const refs = [];
  for (const dep of deps) {
    const target = packages.get(dep);
    if (!target) { errors.push(`${name} depends on unknown workspace package ${dep}`); continue; }
    if (!existsSync(join(target.dir, "tsconfig.json"))) { errors.push(`${dep} (needed by ${name}) has no tsconfig.json`); continue; }
    refs.push({ path: toPosix(relative(dir, target.dir)) });
  }
  refs.sort((a, b) => a.path.localeCompare(b.path));
  const tsconfig = readJson(tsconfigPath);
  tsconfig.references = refs;
  writeIfChanged(tsconfigPath, tsconfig);
}

// Root solution file references every package that has a tsconfig.
const rootConfigPath = join(root, "tsconfig.json");
const rootConfig = readJson(rootConfigPath);
rootConfig.references = [...packages.values()]
  .filter(({ dir }) => existsSync(join(dir, "tsconfig.json")))
  .map(({ dir }) => ({ path: toPosix(relative(root, dir)) }))
  .sort((a, b) => a.path.localeCompare(b.path));
writeIfChanged(rootConfigPath, rootConfig);

// Cycles would fail `tsc -b` anyway; report them with the package names.
const state = new Map();
function visit(name, stack) {
  if (state.get(name) === "done") return;
  if (state.get(name) === "active") { errors.push(`dependency cycle: ${[...stack, name].join(" -> ")}`); return; }
  state.set(name, "active");
  for (const dep of packages.get(name)?.deps ?? []) if (packages.has(dep)) visit(dep, [...stack, name]);
  state.set(name, "done");
}
for (const name of packages.keys()) visit(name, []);

if (errors.length) { console.error(errors.map((e) => `sync-refs: ${e}`).join("\n")); process.exit(1); }
if (check && changes.length) {
  console.error(`sync-refs: references are out of date in:\n  ${changes.join("\n  ")}\nRun \`pnpm sync-refs\`.`);
  process.exit(1);
}
console.log(changes.length ? `sync-refs: ${check ? "would update" : "updated"} ${changes.join(", ")}` : "sync-refs: references are in sync");
