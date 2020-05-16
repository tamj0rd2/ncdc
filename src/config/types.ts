export interface CommonConfig {
  name: string
  request: {
    method: SupportedMethod
    endpoint: string
    body?: Data
    type?: string
    headers?: NcdcHeaders
  }
  response: {
    code: number
    body?: Data
    type?: string
    headers?: NcdcHeaders
  }
}

export const supportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const
export type SupportedMethod = typeof supportedMethods[number]

export class ConfigBuilder {
  private config: CommonConfig = {
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

  public withRequestHeaders(headers: Optional<NcdcHeaders>): ConfigBuilder {
    this.config.request.headers = headers
    return this
  }

  public withResponseCode(code: number): ConfigBuilder {
    this.config.response.code = code
    return this
  }

  public withResponseBody(body: Optional<Data>): ConfigBuilder {
    this.config.response.body = body
    return this
  }

  public withResponseType(type: Optional<string>): ConfigBuilder {
    this.config.response.type = type
    return this
  }

  public withResponseHeaders(headers: Optional<NcdcHeaders>): ConfigBuilder {
    this.config.response.headers = headers
    return this
  }

  public build(): CommonConfig {
    return this.config
  }
}
