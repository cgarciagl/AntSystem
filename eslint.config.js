import globals from "globals";

export default [
  {
    ignores: ["js/tests/**", "node_modules/**"],
  },
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        PIXI: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-undef": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "prefer-const": "warn",
      eqeqeq: ["error", "always"],
    },
  },
];
