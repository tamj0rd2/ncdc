import TypeValidator from './type-validator'
import { Data } from '../types'
import Problem, { ProblemType } from '../problem'
import { Config } from '../config/config'
import { shouldBe } from '../messages'

export type LoaderResponse = { status: number; data?: Data }
export type FetchResource = (config: Config) => Promise<LoaderResponse>
export enum ValidationFlags {
  All,
  RequestType,
  ResponseStatus,
  ResponseBody,
  ResponseType,
}
export type TestFn = (config: Config) => Promise<Problem[]>

// TODO: get rid of this. it's only used by test mode now
export const doItAll = (
  typeValidator: TypeValidator,
  getResponse: FetchResource,
  flags: ValidationFlags.All | ValidationFlags[] = ValidationFlags.All,
): TestFn => {
  const shouldValidate = (target: ValidationFlags): boolean =>
    flags === ValidationFlags.All || flags.includes(target)

  return async (config): Promise<Problem[]> => {
    const { response: responseConfig } = config

    const problems: Problem[] = []
    const response = await getResponse(config)

    if (
      shouldValidate(ValidationFlags.ResponseStatus) &&
      responseConfig.code &&
      response.status !== responseConfig.code
    ) {
      problems.push(
        new Problem(
          {
            data: response.status,
            message: shouldBe('status code', responseConfig.code, response.status),
          },
          ProblemType.Response,
        ),
      )
    }

    if (
      shouldValidate(ValidationFlags.ResponseBody) &&
      responseConfig.body !== undefined &&
      response.data !== responseConfig.body
    ) {
      problems.push(
        new Problem(
          {
            data: response.data,
            message: shouldBe('body', responseConfig.body, response.data),
          },
          ProblemType.Response,
        ),
      )
    }

    if (shouldValidate(ValidationFlags.ResponseType) && responseConfig.type) {
      const result = await typeValidator.getProblems(response.data, responseConfig.type, ProblemType.Response)
      if (result) problems.push(...result)
    }

    return problems
  }
}
