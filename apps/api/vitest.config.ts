import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
      GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
      WEB_ORIGIN: 'http://localhost:3000',
      LOG_LEVEL: 'silent',
    },
  },
});
