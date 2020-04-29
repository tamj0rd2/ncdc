import TypeValidator from './type-validator'
import Problem, { ProblemType } from '~problem'
import { Config } from '~config'
import { shouldBe, problemFetching } from '~messages'

export type LoaderResponse = { status: number; data?: Data }
export type FetchResource = (config: Config) => Promise<LoaderResponse>
export type TestFn = (config: Config) => Promise<Problem[]>

// TODO: get rid of this. it's only used by test mode now
export const doItAll = (typeValidator: TypeValidator, getResponse: FetchResource): TestFn => {
  return async (config): Promise<Problem[]> => {
    const { response: responseConfig } = config

    const problems: Problem[] = []
    let response: LoaderResponse

    try {
      response = await getResponse(config)
    } catch (err) {
      return [
        new Problem(
          {
            message: problemFetching(err.message),
          },
          ProblemType.Response,
        ),
      ]
    }

    if (responseConfig.code && response.status !== responseConfig.code) {
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

    if (responseConfig.body !== undefined && response.data !== responseConfig.body) {
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

    if (responseConfig.type) {
      const result = await typeValidator.getProblems(response.data, responseConfig.type, ProblemType.Response)
      if (result) problems.push(...result)
    }

    return problems
  }
}
