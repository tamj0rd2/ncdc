module.exports = {
  testPathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
  ],
  testEnvironment: 'node',
  setupFiles: ['./src/test-helpers.ts'],
}
