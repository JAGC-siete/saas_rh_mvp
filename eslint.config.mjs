import { defineConfig } from "eslint/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: compat.extends("next/core-web-vitals"),

    rules: {
        "no-unused-vars": "warn",
        "react-hooks/exhaustive-deps": "warn",
        "react/no-unescaped-entities": "warn",
        "@next/next/no-img-element": "off",
        "react/jsx-uses-react": "off",
        "react/react-in-jsx-scope": "off",
    },
}]);