import { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { ResponseConfig } from '../config'
import TypeValidator from '../validation/type-validator'
import { errorNoResponse, errorBadStatusCode, errorWrongStatusCode, shouldBe } from '../messages'
import { SupportedMethod } from '../types'
import Problem from '../problem'

export default class CDCTester {
  constructor(private readonly loader: AxiosInstance, private readonly typeValidator: TypeValidator) {}

  public async test(
    responseConfig: ResponseConfig,
    endpoint: string,
    method: SupportedMethod,
  ): Promise<Problem[]> {
    const problems: Problem[] = []

    let response: AxiosResponse
    try {
      response = await this.getResponse(endpoint, method)
    } catch (err) {
      const axiosErr = err as AxiosError
      const fullUri = this.loader.defaults.baseURL + endpoint

      if (!axiosErr.response) throw new Error(errorNoResponse(fullUri))

      if (!responseConfig.code) throw new Error(errorBadStatusCode(fullUri, axiosErr.response.status))

      if (responseConfig.code !== axiosErr.response.status)
        throw new Error(errorWrongStatusCode(fullUri, responseConfig.code, axiosErr.response.status))

      response = axiosErr.response
    }

    if (responseConfig.code && response.status !== responseConfig.code) {
      problems.push(
        new Problem({
          data: response.status,
          message: shouldBe('status code', responseConfig.code, response.status),
        }),
      )
    }

    if (responseConfig.body && response.data !== responseConfig.body) {
      problems.push(
        new Problem({
          data: response.data,
          message: shouldBe('body', responseConfig.body, response.data),
        }),
      )
    }

    if (responseConfig.type) {
      const result = await this.typeValidator.getProblems(response.data, responseConfig.type)
      if (result?.length) problems.push(...result)
    }

    return problems
  }

  private async getResponse(endpoint: string, method: SupportedMethod): Promise<AxiosResponse> {
    switch (method) {
      case 'GET':
        return await this.loader.get(endpoint)
      case 'POST':
        throw new Error('Not yet implemented')
    }
  }
}
