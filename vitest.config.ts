import {defineConfig} from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  test: {
    environment: 'jsdom',
    include: ['packages/*/tests/**/*.test.{ts,tsx}', 'extensions/*/tests/**/*.test.{ts,tsx}'],
    // O tester importa o módulo da extensão (.tsx) dinamicamente: tem de passar pelo Vite.
    server: {deps: {inline: ['@shopify/ui-extensions-tester']}},
  },
});
