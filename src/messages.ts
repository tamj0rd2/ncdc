import { red, green, blue } from 'chalk'
import { ProblemResult } from '~config/mapper'
import { gatherValidationErrors } from '~commands/shared'
import Problem from '~problem'

export const errorNoResponse = (uri: string): string => `Could not reach ${blue(uri)}`

export const problemFetching = (message: string): string => `${red('Problem with the response')} - ${message}`

export const errorBadStatusCode = (uri: string, actual: number): string =>
  `Received status code ${red(actual)} from ${blue(uri)}`

export const errorWrongStatusCode = (uri: string, expected: number, actual: number): string =>
  `Expected status code ${green(expected)} from ${blue(uri)} but got ${red(actual)}`

export const shouldBe = (property: string, expected: Data, actual: Optional<Data>): string =>
  `${property} should be ${green(expected)} but got ${red(actual)}`

export const validationFailed = ({ name, problems }: ProblemResult): string =>
  `${red('Validation failed')}: ${name} \n${gatherValidationErrors(problems)}\n`

export const testPassed = (name: string, endpoint: string): string =>
  `${green('PASSED')}: ${name} - ${endpoint}\n`

export const testFailed = (name: string, endpoint: string, problems: Problem[]): string =>
  `${red.bold('FAILED')}: ${red.bold(name)}\nURL: ${endpoint}\n${gatherValidationErrors(problems)}`

export const testError = (name: string, message: string): string => `${red('FAILED')}: ${name} - ${message}\n`
