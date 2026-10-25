import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve workspace packages to their sources, like `node --conditions=@acme/source`.
  ssr: { resolve: { conditions: ["@acme/source"] } },
  test: { include: ["{packages,apps}/*/src/**/*.test.ts"] },
});
