import { Endpoint } from './resource'

export interface Resource {
  name: string
  request: {
    method: SupportedMethod
    endpoint: Endpoint
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

export class ResourceBuilder {
  private resource: Resource = {
    name: 'Test',
    request: { endpoint: new Endpoint('/api/resource'), method: 'GET' },
    response: { code: 200, body: 'Hello, world!' },
  }

  public withName(name: string): ResourceBuilder {
    this.resource.name = name
    return this
  }

  public withEndpoint(endpoint: string): ResourceBuilder {
    this.resource.request.endpoint = new Endpoint(endpoint)
    return this
  }

  public withMethod(method: SupportedMethod): ResourceBuilder {
    this.resource.request.method = method
    return this
  }

  public withRequestType(type: string): ResourceBuilder {
    this.resource.request.type = type
    return this
  }

  public withRequestBody(body: Data): ResourceBuilder {
    this.resource.request.body = body
    return this
  }

  public withRequestHeaders(headers: Optional<NcdcHeaders>): ResourceBuilder {
    this.resource.request.headers = headers
    return this
  }

  public withResponseCode(code: number): ResourceBuilder {
    this.resource.response.code = code
    return this
  }

  public withResponseBody(body: Optional<Data>): ResourceBuilder {
    this.resource.response.body = body
    return this
  }

  public withResponseType(type: Optional<string>): ResourceBuilder {
    this.resource.response.type = type
    return this
  }

  public withResponseHeaders(headers: Optional<NcdcHeaders>): ResourceBuilder {
    this.resource.response.headers = headers
    return this
  }

  public build(): Resource {
    return this.resource
  }
}
