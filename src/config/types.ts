import { Request } from './resource'

export interface Resource {
  name: string
  request: Request
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
    request: new Request({ endpoint: '/api/resource', method: 'GET' }),
    response: { code: 200, body: 'Hello, world!' },
  }

  public withName(name: string): ResourceBuilder {
    this.resource.name = name
    return this
  }

  public withRequest(request: Request): ResourceBuilder {
    this.resource.request = request
    return this
  }

  public withEndpoint(endpoint: string): ResourceBuilder {
    this.resource.request = new Request({ ...this.resource.request, endpoint })
    return this
  }

  public withMethod(method: SupportedMethod): ResourceBuilder {
    this.resource.request = new Request({ ...this.resource.request, method })
    return this
  }

  public withRequestType(type: string): ResourceBuilder {
    this.resource.request = new Request({ ...this.resource.request, type })
    return this
  }

  public withRequestBody(body: Data): ResourceBuilder {
    this.resource.request = new Request({ ...this.resource.request, body })
    return this
  }

  public withRequestHeaders(headers: Optional<NcdcHeaders>): ResourceBuilder {
    this.resource.request = new Request({ ...this.resource.request, headers })
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
