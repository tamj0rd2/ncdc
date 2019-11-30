import chalk from 'chalk'
import { Data, DetailedProblem } from './types'

export const mapToProblem = (
  property: string,
  expected: Data,
  actual: Data,
  data?: Data,
): DetailedProblem => ({
  data: data ?? actual,
  dataPath: '',
  message: `${property} should be ${chalk.green(expected)} but got ${chalk.red(actual)}`,
})

export type MapToProblem = typeof mapToProblem

export const errorNoResponse = (uri: string): string => `No response from ${chalk.blue(uri)}`

export const errorBadStatusCode = (uri: string, actual: number): string =>
  `Received status code ${chalk.red(actual)} from ${chalk.blue(uri)}`

export const errorWrongStatusCode = (uri: string, expected: number, actual: number): string =>
  `Expected status code ${chalk.green(expected)} from ${chalk.blue(uri)} but got ${chalk.red(actual)}`
