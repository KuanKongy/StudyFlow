import js from "@eslint/js";
import globals from "globals";

export default [
  {
    // api/, worker/, and frontend/ carry their own eslint configs; the root
    // config lints only the test harness and scripts.
    ignores: [
      "**/node_modules/**",
      "api/**",
      "worker/**",
      "frontend/**",
      "terraform/**",
      "evidence/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["tests/**/*.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
