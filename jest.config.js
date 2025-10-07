// Jest configuration for SLAM25 Full Stack Application
module.exports = {
  projects: [
    // Client tests
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/client/setupTests.js'],
      testMatch: [
        '<rootDir>/client/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/client/**/*.{test,spec}.{js,jsx,ts,tsx}'
      ],
      collectCoverageFrom: [
        'client/**/*.{js,jsx}',
        '!client/**/*.d.ts',
        '!client/main.jsx',
        '!client/index.css',
        '!client/setupTests.js'
      ],
      coverageDirectory: 'coverage/client',
      coverageReporters: ['text', 'lcov', 'html'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
      },
      moduleFileExtensions: ['js', 'jsx', 'json']
    },
    // Server tests
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/server/**/__tests__/**/*.{js,ts}',
        '<rootDir>/server/**/*.{test,spec}.{js,ts}'
      ],
      collectCoverageFrom: [
        'server/**/*.{js,ts}',
        '!server/**/*.d.ts',
        '!server/server.js',
        '!server/tests/**/*'
      ],
      coverageDirectory: 'coverage/server',
      coverageReporters: ['text', 'lcov', 'html'],
      testTimeout: 10000,
      verbose: true
    }
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};