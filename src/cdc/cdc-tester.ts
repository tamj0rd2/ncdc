import { AxiosInstance, AxiosResponse } from 'axios'
import { TestConfig } from '../config'
import TypeValidator from '../validation/type-validator'
import chalk from 'chalk'
import { GetComparisonMessage } from '../messages'

type Problem = string
type TableFormattedProblem = object[]
type Problems = (Problem | TableFormattedProblem)[]

export default class CDCTester {
  constructor(
    private readonly loader: AxiosInstance,
    private readonly typeValidator: TypeValidator,
    private readonly getComparisonMessage: GetComparisonMessage,
  ) {}

  public async test({
    request: { endpoint, method },
    response: responseConfig,
  }: TestConfig): Promise<Problems> {
    const problems: Problems = []

    let response: AxiosResponse
    try {
      response = await this.getResponse(endpoint, method)
    } catch (err) {
      const errorResponse = err.response as AxiosResponse

      if (!errorResponse) {
        problems.push(`No response from ${chalk.underline(endpoint)}`)
        return problems
      }

      if (responseConfig.code !== errorResponse.status) {
        problems.push(
          `Expected status ${chalk.green(responseConfig.code)} but received ${chalk.red(
            errorResponse.status,
          )}`,
        )
        return problems
      }

      response = errorResponse
    }

    if (responseConfig.code && response.status !== responseConfig.code) {
      problems.push(this.getComparisonMessage('status', responseConfig.code, response.status))
    }

    if (responseConfig.body && response.data !== responseConfig.body) {
      problems.push(this.getComparisonMessage('body', responseConfig.body, response.data))
    }

    if (responseConfig.type) {
      const result = this.typeValidator.getValidationErrors(response.data, responseConfig.type)
      if (result) problems.push(result)
    }

    return problems
  }

  private async getResponse(endpoint: string, method: 'GET'): Promise<AxiosResponse> {
    switch (method) {
      case 'GET':
        return await this.loader.get(endpoint)
    }
  }
}
