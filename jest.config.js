const commonSettings = {
  testPathIgnorePatterns: [
    '<rootDir>/bin',
    '<rootDir>/coverage',
    '<rootDir>/lib/',
    '<rootDir>/node_modules/',
  ],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/test-helpers.ts',
    '!<rootDir>/src/metrics.ts',
    '!**/*.spec.ts',
    '!**/*.d.ts',
    '!**/types.ts',
  ],
  testEnvironment: 'node',
  watchPathIgnorePatterns: [
    '<rootDir>\/black-box-tests\/test-environment.*',
    '<rootDir>\/lib.*',
    '<rootDir>\/coverage.*',
    'test-helpers.ts'
  ],
}

const lowLevelTestSettings = {
  moduleNameMapper: {
    '~(.*)$': '<rootDir>/src/$1'
  },
}

const unitTestSettings = {
  ...commonSettings,
  ...lowLevelTestSettings,
  displayName: 'Unit',
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '!**/*.integration.spec.ts',
  ],
  unmockedModulePathPatterns: [
    '<rootDir>/src/test-helpers.ts',
    '<rootDir>/src/config-old/methods.ts',
    '<rootDir>/src/config/types.ts',
    '<rootDir>/src/shared/.*\.ts',
    require.resolve('winston'),
    require.resolve('@hapi/joi'),
    require.resolve('chalk'),
    require.resolve('strip-ansi'),
    require.resolve('dot-object'),
  ],
  automock: true,
  coverageDirectory: './coverage/unit-tests',
  coverageReporters: ["lcov", "text", "text-summary"],
}


const integrationTestSettings = {
  ...commonSettings,
  ...lowLevelTestSettings,
  displayName: 'Integration',
  testMatch: [
    '**/*.integration.spec.ts'
  ],
  coverageDirectory: './coverage/integration-tests',
  coverageReporters: ["lcov", "text", "text-summary"],
  moduleNameMapper: {
    '~(.*)$': '<rootDir>/src/$1'
  },
}

const acceptanceTestSettings = {
  ...commonSettings,
  displayName: 'Acceptance',
  testMatch: [
    '<rootDir>/black-box-tests/acceptance/**/*.spec.ts'
  ],
  coverageDirectory: './coverage/acceptance-tests',
  // using nyc to report the coverage instead
  coverageReporters: ["none"],
  moduleNameMapper: {
    '~shared(.*)$': '<rootDir>/black-box-tests/shared/$1'
  },
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
