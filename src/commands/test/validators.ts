import TypeValidator from '../../validation/type-validator'
import Problem, { ProblemType } from '~problem'
import { shouldBe, problemFetching } from '~messages'
import { TestConfig } from '~commands/test/config'
import { FetchResource, LoaderResponse } from './http-client'

export type TestFn = (config: TestConfig) => Promise<Public<Problem>[]>

const isDeeplyEqual = (expected: unknown, actual: unknown): boolean => {
  if (typeof expected === 'object') {
    if (!expected) return expected === actual
    if (typeof actual !== 'object') return false
    if (!actual) return false

    for (const key in expected) {
      const expectedValue = expected[key as keyof typeof expected]
      const actualValue = actual[key as keyof typeof actual]
      if (!isDeeplyEqual(expectedValue, actualValue)) return false
    }

    return true
  }

  return expected === actual
}

// TODO: get rid of this. it's only used by test mode now
export const doItAll = (typeValidator: Optional<TypeValidator>, getResponse: FetchResource): TestFn => {
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
      return [
        new Problem(
          {
            data: response.status,
            message: shouldBe('status code', responseConfig.code, response.status),
          },
          ProblemType.Response,
        ),
      ]
    }

    if (responseConfig.body !== undefined) {
      if (typeof responseConfig.body !== typeof response.data) {
        problems.push(
          new Problem(
            {
              data: response.data,
              message: shouldBe('body', `of type ${typeof responseConfig.body}`, `a ${typeof response.data}`),
            },
            ProblemType.Response,
          ),
        )
      } else if (!isDeeplyEqual(responseConfig.body, response.data)) {
        problems.push(
          new Problem(
            {
              data: response.data,
              message: 'was not deeply equal to the configured fixture',
            },
            ProblemType.Response,
          ),
        )
      }
    }

    if (typeValidator && responseConfig.type) {
      const result = await typeValidator.getProblems(response.data, responseConfig.type, ProblemType.Response)
      if (result) problems.push(...result)
    }

    return problems
  }
}
