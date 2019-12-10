import { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { ResponseConfig, RequestConfig } from '../config'
import TypeValidator from '../validation/type-validator'
import { errorNoResponse, errorBadStatusCode, errorWrongStatusCode, shouldBe } from '../messages'
import { Data } from '../types'
import Problem, { ProblemType } from '../problem'

export default class CDCTester {
  constructor(private readonly loader: AxiosInstance, private readonly typeValidator: TypeValidator) {}

  public async test(requestConfig: RequestConfig, responseConfig: ResponseConfig): Promise<Problem[]> {
    const response: AxiosResponse = await this.getResponse(requestConfig, responseConfig)

    const problems: Problem[] = []
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
      const result = await this.typeValidator.getProblems(
        response.data,
        responseConfig.type,
        ProblemType.Response,
      )
      if (result?.length) problems.push(...result)
    }

    return problems
  }

  private async getResponse(
    { method, endpoint, body }: RequestConfig,
    { code }: ResponseConfig,
  ): Promise<AxiosResponse<Data>> {
    try {
      switch (method) {
        case 'GET':
          return await this.loader.get(endpoint)
        case 'POST':
          return await this.loader.post(endpoint, body)
      }
    } catch (err) {
      const axiosErr = err as AxiosError
      const fullUri = this.loader.defaults.baseURL + endpoint

      if (!axiosErr.response) throw new Error(errorNoResponse(fullUri))

      if (!code) throw new Error(errorBadStatusCode(fullUri, axiosErr.response.status))

      if (code !== axiosErr.response.status)
        throw new Error(errorWrongStatusCode(fullUri, code, axiosErr.response.status))

      return axiosErr.response
    }
  }
}
