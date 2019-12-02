import {
  TestConfig,
  RequestConfig,
  ResponseConfig,
  MockRequestConfig,
  MockResponseConfig,
  MockConfig,
} from './config'
import { Data, SupportedMethod } from './types'
import { OutgoingHttpHeaders } from 'http'

export default class ConfigBuilder {
  private name = 'Test'
  private request: RequestConfig | MockRequestConfig = { endpoint: '/api/resource', method: 'GET' }
  private response: ResponseConfig | MockResponseConfig = { body: 'Hello, world!' }

  public withName(name: string): ConfigBuilder {
    this.name = name
    return this
  }

  public withEndpoint(endpoint: string): ConfigBuilder {
    this.request.endpoint = endpoint
    return this
  }

  public withMethod(method: SupportedMethod): ConfigBuilder {
    this.request.method = method
    return this
  }

  public withParams(params: (string | string[])[]): ConfigBuilder {
    this.request.params = params
    return this
  }

  public withMockEndpoint(mockEndpoint: string): ConfigBuilder {
    ;(this.request as MockRequestConfig).mockEndpoint = mockEndpoint
    return this
  }

  public withResponseCode(code: number): ConfigBuilder {
    this.response.code = code
    return this
  }

  public withResponseBody(body: Data): ConfigBuilder {
    this.response.body = body
    return this
  }

  public withResponseType(type: string): ConfigBuilder {
    this.response.type = type
    return this
  }

  public withResponseHeaders(headers: OutgoingHttpHeaders): ConfigBuilder {
    this.response.headers = headers
    return this
  }

  public withMockBody(mockBody: Data): ConfigBuilder {
    ;(this.response as MockResponseConfig).mockBody = mockBody
    return this
  }

  public withMockPath(mockPath: string): ConfigBuilder {
    ;(this.response as MockResponseConfig).mockPath = mockPath
    return this
  }

  public build<T = TestConfig | MockConfig>(): T {
    return ({
      name: this.name,
      request: this.request,
      response: this.response,
    } as unknown) as T
  }
}
