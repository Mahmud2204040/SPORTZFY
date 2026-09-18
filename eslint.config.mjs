import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';

export default [
  { ignores: ['node_modules/**', 'backend/**', '.expo*/**', 'dist/**'] },
  {
    files: ['src/**/*.{js,ts,tsx}', 'App.js'],
    languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'warn',
      'no-debugger': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
];
