module.exports = {
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec).[jt]s?(x)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/'
  ],
  moduleNameMapper: {
    '~(.*)$': '<rootDir>/src/$1'
  },
  unmockedModulePathPatterns: [
    '<rootDir>/src/test-helpers.ts',
  ],
  testEnvironment: 'node',
  collectCoverageFrom: [
    '**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/bin/**'
  ],
  automock: true,
}
