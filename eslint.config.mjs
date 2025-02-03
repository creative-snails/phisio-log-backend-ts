import pluginJs from "@eslint/js";
import prettier from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    plugins: {
      prettier: prettier,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "prettier/prettier": "error",
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            [
              "^@?\\w", // Third-party packages
              "^\\.\\.(?!/?$)", // Parent imports
              "^\\.\\./?$",
              "^\\./(?=.*/)(?!/?$)", // Relative imports with nested paths
              "^\\.(?!/?$)",
              "^\\./?$", // Relative imports
            ],
          ],
        },
      ],
    },
  },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];
