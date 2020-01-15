import { red, green, blue } from 'chalk'
import { ProblemResult } from '~config/mapper'
import { gatherValidationErrors } from '~commands/shared'

export const errorNoResponse = (uri: string): string => `Could not reach ${blue(uri)}`

export const errorBadStatusCode = (uri: string, actual: number): string =>
  `Received status code ${red(actual)} from ${blue(uri)}`

export const errorWrongStatusCode = (uri: string, expected: number, actual: number): string =>
  `Expected status code ${green(expected)} from ${blue(uri)} but got ${red(actual)}`

export const shouldBe = (property: string, expected: Data, actual: Optional<Data>): string =>
  `${property} should be ${green(expected)} but got ${red(actual)}`

export const validationFailed = ({ name, problems }: ProblemResult): string =>
  `${red('Validation failed')}: ${name} \n${gatherValidationErrors(problems)}\n`
