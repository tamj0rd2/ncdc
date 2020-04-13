const commonSettings = {
  testPathIgnorePatterns: [
    '<rootDir>/bin',
    '<rootDir>/coverage',
    '<rootDir>/dist/',
    '<rootDir>/node_modules/'
  ],
  moduleNameMapper: {
    '~(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.d.ts',
    '!acceptance-tests/**',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/bin/**'
  ],
  testEnvironment: 'node',
  coverageReporters: ["json"],
}

const unitTestSettings = {
  displayName: 'Unit',
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '!**/*.integration.spec.ts',
  ],
  unmockedModulePathPatterns: [
    '<rootDir>/src/test-helpers.ts',
    '<rootDir>/src/config/methods.ts',
    '<rootDir>/src/shared/.*\.ts',
    require.resolve('winston'),
    require.resolve('yup'),
    require.resolve('chalk'),
  ],
  automock: true,
}


const integrationTestSettings = {
  displayName: 'Integration',
  testMatch: [
    '**/*.integration.spec.ts'
  ]
}

const acceptanceTestSettings = {
  displayName: 'Acceptance',
  testMatch: [
    '<rootDir>/acceptance-tests/**/*.spec.ts'
  ]
}


switch (process.env.TEST_MODE) {
  case 'unit':
    module.exports = unitTestSettings
    break
  case 'integration':
    module.exports = integrationTestSettings
    break
  case 'acceptance':
    module.exports = acceptanceTestSettings
    break
  default:
    module.exports = {
      ...commonSettings,
      projects: [
        unitTestSettings,
        integrationTestSettings,
        acceptanceTestSettings
      ],
    }
}
