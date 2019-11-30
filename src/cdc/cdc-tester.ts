import { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { ResponseConfig } from '../config'
import TypeValidator from '../validation/type-validator'
import { MapToProblem, errorNoResponse, errorBadStatusCode, errorWrongStatusCode } from '../messages'
import { DetailedProblem, SupportedMethod } from '../types'

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
      const axiosErr = err as AxiosError
      const fullUri = this.loader.defaults.baseURL + endpoint

      if (!axiosErr.response) throw new Error(errorNoResponse(fullUri))

      if (!responseConfig.code) throw new Error(errorBadStatusCode(fullUri, axiosErr.response.status))

      if (responseConfig.code !== axiosErr.response.status)
        throw new Error(errorWrongStatusCode(fullUri, responseConfig.code, axiosErr.response.status))

      response = axiosErr.response
    }

    if (responseConfig.code && response.status !== responseConfig.code) {
      problems.push(this.mapToProblem('status code', responseConfig.code, response.status))
    }

    if (responseConfig.body && response.data !== responseConfig.body) {
      problems.push(this.mapToProblem('body', responseConfig.body, response.data))
    }

    if (responseConfig.type) {
      const result = this.typeValidator.getProblems(response.data, responseConfig.type)
      if (result?.length) problems.push(...result)
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
