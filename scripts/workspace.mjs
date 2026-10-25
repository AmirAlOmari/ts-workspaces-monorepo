// Shared helpers: find workspace package directories from pnpm-workspace.yaml.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Reads the `packages:` list. Supports "dir/*" and plain "dir" globs, which is all pnpm layouts here need.
function readGlobs() {
  const text = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");
  const globs = [];
  let inPackages = false;
  for (const line of text.split("\n")) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const m = /^\s*-\s*["']?([^"'#\s]+)["']?/.exec(line);
      if (m) globs.push(m[1]);
      else if (/^\S/.test(line)) inPackages = false;
    }
  }
  return globs;
}

export function listWorkspaceDirs() {
  const dirs = [];
  for (const glob of readGlobs()) {
    if (glob.startsWith("!")) continue;
    if (glob.endsWith("/*")) {
      const base = join(root, glob.slice(0, -2));
      if (!existsSync(base)) continue;
      for (const name of readdirSync(base).sort()) {
        const dir = join(base, name);
        if (statSync(dir).isDirectory() && existsSync(join(dir, "package.json"))) dirs.push(dir);
      }
    } else if (existsSync(join(root, glob, "package.json"))) {
      dirs.push(join(root, glob));
    }
  }
  return dirs;
}
