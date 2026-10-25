#!/usr/bin/env node
// Adds Nx to a generated bench repo (bench/gen.mjs output) without touching this template.
//   node bench/nx/setup.mjs <generated-repo> [--dts-inputs]
// Each package gets an `nx.targets.build` that runs `tsc -p tsconfig.json` (no `pnpm run` hop).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [repo, ...rest] = process.argv.slice(2);
const dtsInputs = rest.includes("--dts-inputs");
const transitive = rest.includes("--transitive");
for (const d of readdirSync(join(repo, "packages"))) {
  const file = join(repo, "packages", d, "package.json");
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  pkg.nx = {
    targets: { build: { command: "tsc -p tsconfig.json", options: { cwd: "{projectRoot}" } } },
  };
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
}
const build = {
  dependsOn: ["^build"],
  // default: a dependency's source files feed the hash, so any edit invalidates all dependents.
  // --dts-inputs: a dependency's emitted .d.ts feeds the hash instead (early cutoff, like tsc -b).
  inputs: dtsInputs
    ? [
        "{projectRoot}/src/**/*",
        "{projectRoot}/tsconfig.json",
        "sharedGlobals",
        { dependentTasksOutputFiles: "**/*.d.ts", transitive },
      ]
    : ["production", "^production"],
  outputs: ["{projectRoot}/dist", "{projectRoot}/tsconfig.tsbuildinfo"],
  cache: true,
};
writeFileSync(
  join(repo, "nx.json"),
  `${JSON.stringify(
    {
      $schema: "./node_modules/nx/schemas/nx-schema.json",
      namedInputs: {
        default: ["{projectRoot}/**/*", "sharedGlobals"],
        sharedGlobals: ["{workspaceRoot}/tsconfig.base.json", "{workspaceRoot}/pnpm-lock.yaml"],
        production: ["default", "!{projectRoot}/**/*.test.ts"],
      },
      targetDefaults: { build },
    },
    null,
    2,
  )}\n`,
);
console.error(
  `nx config written (${dtsInputs ? `d.ts early cutoff, transitive=${transitive}` : "default source inputs"})`,
);
