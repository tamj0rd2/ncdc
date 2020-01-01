import { MockRequestConfig, MockResponseConfig } from '../../config/config'
import { Data, SupportedMethod } from '../../types'
import { OutgoingHttpHeaders } from 'http'
import { RouteConfig } from './server'

export default class RouteConfigBuilder {
  private config: RouteConfig = {
    name: 'Test',
    request: { endpoint: '/api/resource', method: 'GET' },
    response: { body: 'Hello, world!' },
  }

  public withName(name: string): RouteConfigBuilder {
    this.config.name = name
    return this
  }

  public withEndpoint(endpoint: string): RouteConfigBuilder {
    this.config.request.endpoint = endpoint
    return this
  }

  public withMethod(method: SupportedMethod): RouteConfigBuilder {
    this.config.request.method = method
    return this
  }

  public withMockEndpoint(mockEndpoint: string): RouteConfigBuilder {
    ;(this.config.request as MockRequestConfig).mockEndpoint = mockEndpoint
    return this
  }

  public withRequestBodyType(bodyType: string): RouteConfigBuilder {
    this.config.request.bodyType = bodyType
    return this
  }

  public withResponseCode(code: number): RouteConfigBuilder {
    this.config.response.code = code
    return this
  }

  public withResponseBody(body: Data): RouteConfigBuilder {
    this.config.response.body = body
    return this
  }

  public withResponseHeaders(headers: OutgoingHttpHeaders): RouteConfigBuilder {
    this.config.response.headers = headers
    return this
  }

  public withMockBody(mockBody: Data): RouteConfigBuilder {
    ;(this.config.response as MockResponseConfig).mockBody = mockBody
    return this
  }

  public withMockPath(mockPath: string): RouteConfigBuilder {
    ;(this.config.response as MockResponseConfig).mockPath = mockPath
    return this
  }

  public build(): RouteConfig {
    return this.config
  }
}
