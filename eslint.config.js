import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', 'dist-check/**', '**/shopify.d.ts']},
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['extensions/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {shopify: 'readonly', document: 'readonly', fetch: 'readonly', globalThis: 'readonly'},
    },
    rules: {
      'no-console': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-restricted-syntax': [
        'error',
        {selector: "JSXAttribute[name.name='style']", message: 'CSS arbitrário não é suportado em UI extensions.'},
        {selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'HTML arbitrário não é permitido.'},
        {
          selector: 'JSXOpeningElement[name.type="JSXIdentifier"][name.name=/^[a-z](?!-)/]:not([name.name=/^s-/])',
          message: 'Usar apenas Polaris web components (s-*); HTML arbitrário não é suportado.',
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['extensions/**/tests/**/*.{ts,tsx}', 'packages/**/tests/**/*.{ts,tsx}'],
    rules: {'@typescript-eslint/no-non-null-assertion': 'off'},
  },
);
