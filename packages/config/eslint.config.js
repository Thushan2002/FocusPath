import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Shared flat config for every TS package in the monorepo. */
export default tseslint.config(
  { ignores: ["dist/**", ".next/**", "drizzle/**", "coverage/**", "playwright-report/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
);
