// `tsc -b --clean` leaves empty dist folders behind; remove them.
import { rmSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { listWorkspaceDirs } from "./workspace.mjs";

for (const dir of listWorkspaceDirs()) {
  const dist = join(dir, "dist");
  if (existsSync(dist) && readdirSync(dist).length === 0) rmSync(dist, { recursive: true });
}
