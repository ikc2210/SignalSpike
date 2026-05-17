import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
  },
  resolve: {
    // Point workspace package imports to their TypeScript source so vitest
    // can transform them without requiring a build step.
    alias: {
      '@perplexity/ontology': new URL('../ontology/src/index.ts', import.meta.url).pathname,
      '@perplexity/db': new URL('../db/src/index.ts', import.meta.url).pathname,
    },
  },
});
