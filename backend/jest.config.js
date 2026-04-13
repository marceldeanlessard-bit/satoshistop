module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['**/*.js', '!node_modules/**', '!__tests__/**'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 10000,
};
