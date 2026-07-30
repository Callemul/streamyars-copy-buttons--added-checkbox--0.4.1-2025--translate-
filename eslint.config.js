import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['lib/**', 'libs/**', 'dist/**', 'node_modules/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...globals.node,
        chrome: 'readonly',
        $: 'readonly',
        jQuery: 'readonly',
        Chart: 'readonly',
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-console': 'off',
      'prefer-const': 'warn',
      'eqeqeq': ['error', 'always'],
      'no-empty': 'warn',
    }
  }
];
