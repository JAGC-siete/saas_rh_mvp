const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");
const path = require("node:path");

const __filename = path.resolve(__filename);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

const config = [...compat.extends("next/core-web-vitals"), {
    rules: {
        "@next/next/no-img-element": "off",
        "react-hooks/exhaustive-deps": "warn",
        "react/no-unescaped-entities": "warn"
    }
}];

module.exports = config;
