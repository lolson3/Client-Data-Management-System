import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // The Excel-backed datasets are schemaless at the boundary. These should
      // be replaced gradually with generated workbook record types.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      // Several client-only components intentionally derive their initial DOM
      // state after hydration or reset transient UI when a record changes.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["scripts/**/*.js", "electron-app/**/*.js", "tailwind.config.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist-electron/**",
    "dist-server/**",
    "temp-server-build/**",
    "public/docs-assets/**",
    "public/openapi.json",
    "next-env.d.ts",
  ]),
]);
