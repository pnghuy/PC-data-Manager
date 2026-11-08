import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        LAB: 'writable',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-useless-escape': 'off',
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'data/github-snapshot.js',
      'data/sample-data.js',
      '.vscode/**',
    ],
  },
];
