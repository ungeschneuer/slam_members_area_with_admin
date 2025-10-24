import { defineConfig, defineProject, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      exclude: [
        ...configDefaults.coverage.exclude,
      ]
    },
  },
  projects: [
    defineProject({
      test: {
        name: 'server',
        environment: 'node',
        include: ['server/**/*.test.{js,jsx,ts,tsx}'],
        exclude: ['node_modules/**', 'server/__tests__/admin-crud/**'],
        setupFiles: ['server/__tests__/test-env.js'],
        testTimeout: 30000, // 30s for database operations
      }
    }),
    defineProject({
      test: {
        name: 'client',
        environment: 'jsdom',
        include: ['client/**/*.test.{js,jsx,ts,tsx}'],
        setupFiles: ['client/test.setup.js'],
        exclude: ['node_modules/**'],
      }
    }),
    defineProject({
      test: {
        name: 'admin-crud',
        environment: 'node',
        include: ['server/__tests__/admin-crud/**/*.test.js'],
        setupFiles: ['server/__tests__/test-env.js', 'server/__tests__/admin-crud/setup.js'],
        testTimeout: 30000, // 30s for database operations
        exclude: ['node_modules/**'],
      }
    })
  ]
});


