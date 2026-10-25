// Run from the generated repo: eslint --config <this file>. TYPED=1 enables type-aware rules.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

const typed = process.env.TYPED === "1";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/dist-vp/**", "**/node-tests/**", "**/node_modules/**"] },
  js.configs.recommended,
  ...(typed ? tseslint.configs.recommendedTypeChecked : tseslint.configs.recommended),
  {
    files: ["**/*.ts"],
    languageOptions: typed
      ? { parserOptions: { projectService: true, tsconfigRootDir: process.cwd() } }
      : {},
  },
);
