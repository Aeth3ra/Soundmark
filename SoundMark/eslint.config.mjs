import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { defineConfig } from "eslint/config";
// TODO: Re-enable these rules and refactor existing violations.
export default defineConfig([
  {
    ignores: [
      "**/node_modules/**",
      "**/.meteor/**",
      "**/_build/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**"
    ]
  },
  {
    files: ["**/*.js", "**/*.jsx"],
    extends: [js.configs.recommended],
    plugins: {
      react,
      "react-hooks": reactHooks
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.mocha,
        Meteor: "readonly",
        Mongo: "readonly",
        Tracker: "readonly",
        Accounts: "readonly",
        Assets: "readonly"
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_"
        }
      ],
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react/no-unescaped-entities": "warn",
      "no-undef": "warn"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
]);
