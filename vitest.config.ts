import { defineConfig } from 'vitest/config';

// Unit/integration tests run in Node (the helpers under test are pure or only
// touch globals that are absent in Node, which is the behavior we assert).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
