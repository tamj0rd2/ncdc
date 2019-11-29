import { AxiosInstance, AxiosResponse } from 'axios'
import { ResponseConfig } from '../config'
import TypeValidator from '../validation/type-validator'
import chalk from 'chalk'
import { MapToProblem } from '../messages'
import { DetailedProblem, SupportedMethod } from '../types'
import { CustomError } from '../errors'

export type Problems = string | DetailedProblem[]

export default class CDCTester {
  constructor(
    private readonly loader: AxiosInstance,
    private readonly typeValidator: TypeValidator,
    private readonly mapToProblem: MapToProblem,
  ) {}

  public async test(
    responseConfig: ResponseConfig,
    endpoint: string,
    method: SupportedMethod,
  ): Promise<Problems> {
    const problems: DetailedProblem[] = []

    let response: AxiosResponse
    try {
      response = await this.getResponse(endpoint, method)
    } catch (err) {
      const errorResponse = err.response as AxiosResponse
      const fullAddress = err.config.baseURL + endpoint

      if (!errorResponse) {
        throw new CustomError(`No response from ${chalk.blue(fullAddress)}`)
      }

      if (responseConfig.code !== errorResponse.status) {
        throw new CustomError(
          `Expected status ${chalk.green(responseConfig.code)} from ${chalk.blue(
            fullAddress,
          )} but got ${chalk.red(errorResponse.status)}`,
        )
      }

      response = errorResponse
    }

    if (responseConfig.code && response.status !== responseConfig.code) {
      problems.push(this.mapToProblem('status', responseConfig.code, response.status))
    }

    if (responseConfig.body && response.data !== responseConfig.body) {
      problems.push(this.mapToProblem('body', responseConfig.body, response.data))
    }

    if (responseConfig.type) {
      const result = this.typeValidator.getValidationProblems(response.data, responseConfig.type)
      if (result) typeof result === 'string' ? problems.push(result) : problems.push(...result)
    }

    return problems
  }

  private async getResponse(endpoint: string, method: SupportedMethod): Promise<AxiosResponse> {
    switch (method) {
      case 'GET':
        return await this.loader.get(endpoint)
    }
  }
}
