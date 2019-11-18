import chalk from 'chalk'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getComparisonMessage = (property: string, expected: any, actual: any): string =>
  `Expected ${property} to be ${chalk.green(expected)} but received ${chalk.red(actual)}`

export type GetComparisonMessage = typeof getComparisonMessage
