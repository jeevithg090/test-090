import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['build/', 'dist/', '.parcel-cache/', 'node_modules/', 'coverage/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // `process.env.*` is inlined by Parcel at build time.
      globals: { ...globals.browser, process: 'readonly' },
    },
  },
  {
    files: ['tests/**/*.js', '*.config.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
