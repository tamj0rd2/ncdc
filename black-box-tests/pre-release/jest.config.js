module.exports = {
  preset: 'ts-jest',
  moduleNameMapper: {
    '~shared(.*)$': '<rootDir>/../shared/$1'
  },
}
