import { SupportedMethod, Config } from '.'
import { IncomingHttpHeaders } from 'http'

export default class ConfigBuilder {
  private config: Config = {
    name: 'Test',
    request: { endpoint: '/api/resource', method: 'GET' },
    response: { code: 200, body: 'Hello, world!' },
  }

  public withName(name: string): ConfigBuilder {
    this.config.name = name
    return this
  }

  public withEndpoint(endpoint: string): ConfigBuilder {
    this.config.request.endpoint = endpoint
    return this
  }

  public withMethod(method: SupportedMethod): ConfigBuilder {
    this.config.request.method = method
    return this
  }

  public withRequestType(type: string): ConfigBuilder {
    this.config.request.type = type
    return this
  }

  public withRequestBody(body: Data): ConfigBuilder {
    this.config.request.body = body
    return this
  }

  public withRequestHeaders(headers?: Record<string, string>): ConfigBuilder {
    this.config.request.headers = headers
    return this
  }

  public withResponseCode(code: number): ConfigBuilder {
    this.config.response.code = code
    return this
  }

  public withResponseBody(body?: Data): ConfigBuilder {
    this.config.response.body = body
    return this
  }

  public withResponseHeaders(headers?: IncomingHttpHeaders): ConfigBuilder {
    this.config.response.headers = headers
    return this
  }

  public build(): Config {
    return this.config
  }
}
