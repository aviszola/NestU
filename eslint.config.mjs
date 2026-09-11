import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Dev tooling, bukan production — `scripts/*.cjs` & `scripts/tests/*.mjs`
    // pakai require()/any, wajar ge-ignore dari lint.
    "scripts/**",
    // QA dev scripts (gitignored) — niet production.
    "scratch/**",
  ]),
  {
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      "@next": nextPlugin.default ?? nextPlugin,
    },
    rules: {
      // 150+ no-explicit-any errors al lang existing — downgrade naar warning,
      // wordt incrementeel gefixt in een aparte task.
      "@typescript-eslint/no-explicit-any": "warn",
      // Rule van React 19 + eslint-plugin-react-hooks, te strict voor codebase
      // existing (call setState in effect). Downgrade naar warning.
      "react-hooks/set-state-in-effect": "warn",
      // Enkele noisy warning-rules versoepelen (met underscore-prefix ignore).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@next/next/no-img-element": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);

export default eslintConfig;
