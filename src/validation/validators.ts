import TypeValidator from './type-validator'
import { Data } from '../types'
import Problem, { ProblemType } from '../problem'
import { TestConfig } from '../config'
import { shouldBe } from '../messages'

export type LoaderResponse = { status: number; data?: Data }
export type FetchResource<Config extends TestConfig = TestConfig> = (
  config: Config,
) => Promise<LoaderResponse>
export enum ValidationFlags {
  All,
  RequestType,
  ResponseStatus,
  ResponseBody,
  ResponseType,
}
export type TestFn<Config extends TestConfig = TestConfig> = (config: Config) => Promise<Problem[]>

export const doItAll = (
  typeValidator: TypeValidator,
  getResponse: FetchResource,
  flags: ValidationFlags.All | ValidationFlags[] = ValidationFlags.All,
): TestFn => {
  const shouldValidate = (target: ValidationFlags): boolean =>
    flags === ValidationFlags.All || flags.includes(target)

  return async (config): Promise<Problem[]> => {
    const { request: requestConfig, response: responseConfig } = config

    if (shouldValidate(ValidationFlags.RequestType) && requestConfig.type) {
      const result = await typeValidator.getProblems(
        requestConfig.body,
        requestConfig.type,
        ProblemType.Request,
      )

      if (result) return result
    }

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
