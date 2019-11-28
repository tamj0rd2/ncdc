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
