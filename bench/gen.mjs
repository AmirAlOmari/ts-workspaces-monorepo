#!/usr/bin/env node
// Generates a synthetic monorepo from this template's root config, to benchmark the pipelines.
//   node bench/gen.mjs <target-dir> [--packages 40] [--files 40] [--layers 5]
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [target, ...rest] = process.argv.slice(2);
if (!target) throw new Error("usage: gen.mjs <target-dir> [--packages N] [--files N] [--layers N]");
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? Number(rest[i + 1]) : fallback;
};
const PACKAGES = opt("packages", 40);
const FILES = opt("files", 40);
const LAYERS = opt("layers", 5);
const perLayer = Math.ceil(PACKAGES / LAYERS);

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const f of [
  "package.json",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "tsconfig.base.json",
  ".gitignore",
  ".nvmrc",
]) {
  cpSync(join(root, f), join(target, f));
}
cpSync(join(root, "scripts"), join(target, "scripts"), { recursive: true });
// The node:test baseline files are not part of any tsconfig, so keep them out of vp lint.
writeFileSync(
  join(target, "vite.config.ts"),
  readFileSync(join(root, "vite.config.ts"), "utf8").replace(
    'ignorePatterns: ["**/dist/**", "**/dist-vp/**"]',
    'ignorePatterns: ["**/dist/**", "**/dist-vp/**", "**/node-tests/**"]',
  ),
);
// The solution file starts empty; `scripts/sync-refs.mjs` fills it in from the generated packages.
writeFileSync(
  join(target, "tsconfig.json"),
  `${JSON.stringify({ files: [], references: [] }, null, 2)}\n`,
);

const name = (n) => `pkg-${String(n).padStart(3, "0")}`;
const write = (file, text) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};

// Package n sits in layer floor(n / perLayer) and depends on two packages from the layer below.
const depsOf = (n) => {
  const layer = Math.floor(n / perLayer);
  if (layer === 0) return [];
  const below = (layer - 1) * perLayer;
  const pick = (k) => below + ((n + k) % perLayer);
  return [...new Set([pick(0), pick(3)])].filter((d) => d < PACKAGES);
};

for (let n = 0; n < PACKAGES; n++) {
  const dir = join(target, "packages", name(n));
  const deps = depsOf(n);
  write(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: `@acme/${name(n)}`,
        version: "0.0.0",
        private: true,
        type: "module",
        scripts: { "vp:pack": "vp pack src/index.ts --dts -d dist-vp" },
        exports: {
          ".": {
            "@acme/source": "./src/index.ts",
            types: "./dist/index.d.ts",
            default: "./dist/index.js",
          },
        },
        dependencies: Object.fromEntries(deps.map((d) => [`@acme/${name(d)}`, "workspace:*"])),
      },
      null,
      2,
    ) + "\n",
  );
  write(
    join(dir, "tsconfig.json"),
    JSON.stringify(
      {
        extends: "../../tsconfig.base.json",
        compilerOptions: { rootDir: "src", outDir: "dist" },
        include: ["src"],
        exclude: ["src/**/*.test.ts"],
        references: [],
      },
      null,
      2,
    ) + "\n",
  );

  for (let i = 0; i < FILES; i++) {
    write(
      join(dir, "src", `mod${i}.ts`),
      `export interface Rec${n}_${i}<T> {
  id: number;
  value: T;
  tags: string[];
}

type StringKeys${i}<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T];

export function make${n}_${i}<T>(value: T, id = ${i}): Rec${n}_${i}<T> {
  return { id, value, tags: [\`pkg${n}\`, \`mod${i}\`] };
}

export function pick${n}_${i}<T extends object>(o: T, ...keys: StringKeys${i}<T>[]): string[] {
  return keys.map((k) => String(o[k]));
}

export function sum${n}_${i}(items: readonly Rec${n}_${i}<number>[]): number {
  let total = 0;
  for (const item of items) total += item.value * (item.id + 1);
  return total;
}
`,
    );
  }

  const imports = deps.map((d, k) => `import { compute as dep${k} } from "@acme/${name(d)}";`);
  write(
    join(dir, "src", "index.ts"),
    `${imports.join("\n")}
${Array.from({ length: FILES }, (_, i) => `export * from "./mod${i}.ts";`).join("\n")}
import { make${n}_0, sum${n}_0 } from "./mod0.ts";

export function compute(x: number): number {
  const own = sum${n}_0([make${n}_0(x), make${n}_0(x + 1, 1)]);
  return own${deps.map((_, k) => ` + dep${k}(x)`).join("")};
}
`,
  );
  // Same test twice: vitest for the vp pipeline, node:test for the raw baseline.
  write(
    join(dir, "src", "index.test.ts"),
    `import { expect, test } from "vite-plus/test";
import { compute } from "./index.ts";

test("compute is deterministic", () => {
  expect(compute(2)).toBe(compute(2));
});
`,
  );
  write(
    join(dir, "node-tests", "index.test.ts"),
    `import assert from "node:assert/strict";
import { test } from "node:test";
import { compute } from "../src/index.ts";

test("compute is deterministic", () => {
  assert.equal(compute(2), compute(2));
});
`,
  );
}

console.log(`generated ${PACKAGES} packages x ${FILES} files in ${LAYERS} layers at ${target}`);
