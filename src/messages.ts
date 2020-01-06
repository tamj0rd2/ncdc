import chalk from 'chalk'

export const errorNoResponse = (uri: string): string => `Could not reach ${chalk.blue(uri)}`

export const errorBadStatusCode = (uri: string, actual: number): string =>
  `Received status code ${chalk.red(actual)} from ${chalk.blue(uri)}`

export const errorWrongStatusCode = (uri: string, expected: number, actual: number): string =>
  `Expected status code ${chalk.green(expected)} from ${chalk.blue(uri)} but got ${chalk.red(actual)}`

export const shouldBe = (property: string, expected: Data, actual: Optional<Data>): string =>
  `${property} should be ${chalk.green(expected)} but got ${chalk.red(actual)}`
