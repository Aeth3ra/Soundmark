import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { defineConfig } from "eslint/config";
// TODO: Re-enable these rules and refactor existing violations.
export default defineConfig([
  {
    files: ["**/*.js", "**/*.jsx"],
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_"
        }
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off"
    },
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
      ]
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
]);
