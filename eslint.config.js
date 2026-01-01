export default {
  languageOptions: {
    globals: {
      console: "readonly",
      process: "readonly",
    },
    ecmaVersion: 2022,
    sourceType: "module",
  },
  extends: ["eslint:recommended", "@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: ["./tsconfig.json", "./packages/*/tsconfig.json"],
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-empty-function": "warn",
  },
  overrides: [
    {
      files: ["packages/frontend/**/*.{js,ts,vue}"],
      env: {
        browser: true,
        node: false,
      },
      extends: ["plugin:vue/vue3-essential", "@vue/eslint-config-typescript"],
      parser: "vue-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    {
      files: ["**/*.test.{js,ts}", "**/*.spec.{js,ts}"],
      env: {
        jest: true,
      },
    },
  ],
}
