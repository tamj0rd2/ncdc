import { red, green, blue } from 'chalk'
import { ProblemResult } from '~config/mapper'
import { gatherValidationErrors } from '~commands/shared'
import Problem from '~problem'

export const errorNoResponse = (uri: string): string => `Could not reach ${blue(uri)}`

export const errorBadStatusCode = (uri: string, actual: number): string =>
  `Received status code ${red(actual)} from ${blue(uri)}`

export const errorWrongStatusCode = (uri: string, expected: number, actual: number): string =>
  `Expected status code ${green(expected)} from ${blue(uri)} but got ${red(actual)}`

export const shouldBe = (property: string, expected: Data, actual: Optional<Data>): string =>
  `${property} should be ${green(expected)} but got ${red(actual)}`

export const validationFailed = ({ name, problems }: ProblemResult): string =>
  `${red('Validation failed')}: ${name} \n${gatherValidationErrors(problems)}\n`

const testResult = (passed: boolean, name: string, suffix: string): string => {
  const prefix = passed ? green('PASSED') : red('FAILED')
  return `${prefix}: ${name} - ${suffix}`
}

// TODO: it would be cool to reuse the ProblemResult abstraction here
export const testPassed = (name: string, endpoint: string): string => testResult(true, name, endpoint)
export const testFailed = (name: string, endpoint: string, problems: Problem[]): string =>
  `${testResult(false, name, endpoint)}\n${gatherValidationErrors(problems)}`
export const testError = (name: string, message: string): string => testResult(false, name, message)
