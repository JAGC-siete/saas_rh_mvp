// eslint.config.js
const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");
const path = require("node:path");

// Get current directory
const currentDir = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: currentDir
});

module.exports = [
  ...compat.extends("next/core-web-vitals"),
  js.configs.recommended,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "warn"
    }
  }
];
