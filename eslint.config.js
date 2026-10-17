import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["**/node_modules/", "**/dist/", "**/coverage/", "backend/data/"] },
  js.configs.recommended,
  {
    files: ["*.js", "backend/**/*.js", "frontend/vite.config.js", "frontend/tests/**/*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["frontend/src/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      eqeqeq: ["error", "smart"],
    },
  },
  // Turns off style rules that would fight with Prettier (Prettier owns formatting).
  prettier,
];
