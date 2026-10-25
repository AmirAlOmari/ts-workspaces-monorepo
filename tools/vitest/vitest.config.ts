import { defineConfig } from "vitest/config";

export default defineConfig({
  // Run from the repo root, whatever the config location.
  root: new URL("../..", import.meta.url).pathname,
  // Resolve workspace packages to their sources, like `node --conditions=@acme/source`.
  ssr: { resolve: { conditions: ["@acme/source"] } },
  test: { include: ["{packages,apps}/*/src/**/*.spec.ts"] },
});
