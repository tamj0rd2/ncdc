import { red, green, blue } from 'chalk'
import { gatherValidationErrors } from '~commands/shared'
import Problem from '~problem'

export interface ProblemResult {
  name: string
  problems: ReadonlyArray<Problem>
}

export const isProblemResult = (x: unknown): x is ProblemResult =>
  typeof x === 'object' && (x as ProblemResult).problems !== undefined

export const containsProblemResult = (x: unknown): x is ReadonlyArray<ProblemResult> =>
  Array.isArray(x) && !!x.find(isProblemResult)

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

export const testFailed = (name: string, endpoint: string, problems: Public<Problem>[]): string =>
  `${red.bold('FAILED')}: ${red.bold(name)}\nURL: ${endpoint}\n${gatherValidationErrors(problems)}\n`

export const testError = (name: string, endpoint: string, message: string): string =>
  `${red.bold('ERROR')}: ${red.bold(name)}\nURL: ${endpoint}\n${message}\n`
