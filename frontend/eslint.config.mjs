import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  {
    ...nextPlugin.configs["core-web-vitals"],
    files: ["**/*.{js,jsx,ts,tsx,mjs}"],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    ignores: [".next/", "node_modules/", "dist/"],
  },
];
