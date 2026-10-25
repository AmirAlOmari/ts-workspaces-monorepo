// Opt-in Vite+ (`vp`) config, used only by the `vp:*` scripts. The default scripts never read this file.
import { defineConfig } from "vite-plus";

export default defineConfig({
  // Resolve workspace packages to their sources, like `node --conditions=@acme/source`.
  ssr: { resolve: { conditions: ["@acme/source"] } },
  test: { include: ["{packages,apps}/*/src/**/*.spec.ts"] },
  lint: {
    ignorePatterns: ["**/dist/**", "**/dist-vp/**", "bench/**"],
    options: { typeAware: true, typeCheck: true },
  },
  fmt: { ignorePatterns: ["**/dist/**", "**/dist-vp/**", "**/tsconfig.json", "pnpm-lock.yaml"] },
});
