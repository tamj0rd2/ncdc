module.exports = {
  testPathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
  ],
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['./src/test-helpers.ts'],
}
