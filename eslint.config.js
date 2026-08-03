import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['lib/**', 'libs/**', 'dist/**', 'node_modules/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs', '**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
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
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-this-alias': ['error', { allowedNames: ['self'] }],
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'no-useless-assignment': 'off',
      'no-useless-escape': 'warn',
      'no-undef': 'off',
      'no-console': 'off',
      'prefer-const': 'warn',
      'eqeqeq': ['error', 'always'],
      'no-empty': 'warn',
      'no-restricted-syntax': [
        'error',
        {
          // dataset['key-with-hyphens'] = ... або ... = dataset['key-with-hyphens']
          // порушує специфікацію WHATWG DOM (SyntaxError у jsdom і Chrome).
          // Правильна альтернатива: element.getAttribute('data-key-with-hyphens')
          //                         element.setAttribute('data-key-with-hyphens', value)
          selector: "MemberExpression[computed=true][object.property.name='dataset']",
          message:
            "Заборонено: dataset[key] (bracket-notation). " +
            "Використовуй getAttribute / setAttribute з повним 'data-' атрибутом. " +
            "Причина: дефіси в ключі DOMStringMap кидають SyntaxError (WHATWG DOM spec)."
        }
      ],
    }
  }
);
