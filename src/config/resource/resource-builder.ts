import { Method } from './method'
import { randomString } from '~test-helpers'
import { Resource } from './resource'
import { Request, RequestInput } from './request'
import { Response, ResponseInput } from './response'

export class ResourceBuilder {
  public static random(): Resource {
    return new ResourceBuilder().build()
  }

  /** @deprecated use ResourceBuilder.random() */
  public static get Default(): Resource {
    return ResourceBuilder.random()
  }

  private resourceInput: ResourceInput = {
    name: 'Test',
    request: {
      endpoint: '/api/resource',
      method: Method.GET,
      body: undefined,
      headers: undefined,
      type: undefined,
    },
    response: {
      code: 200,
      body: 'Hello, world!',
      headers: undefined,
      type: undefined,
    },
  }

  public withName(name: string): ResourceBuilder {
    this.resourceInput.name = name
    return this
  }

  public withEndpoint(endpoint: string): ResourceBuilder {
    this.resourceInput.request = { ...this.resourceInput.request, endpoint }
    return this
  }

  public withMethod(method: Method): ResourceBuilder {
    this.resourceInput.request = { ...this.resourceInput.request, method }
    return this
  }

  public withRequestType(type: string): ResourceBuilder {
    this.resourceInput.request = { ...this.resourceInput.request, type }
    return this
  }

  public withRequestBody(body: Data): ResourceBuilder {
    this.resourceInput.request = { ...this.resourceInput.request, body }
    return this
  }

  public withRequestHeaders(headers: Record<string, string>): ResourceBuilder {
    this.resourceInput.request = { ...this.resourceInput.request, headers }
    return this
  }

  public withResponseCode(code: number): ResourceBuilder {
    this.resourceInput.response = { ...this.resourceInput.response, code }
    return this
  }

  public withResponseBody(body: Optional<Data>): ResourceBuilder {
    this.resourceInput.response = { ...this.resourceInput.response, body }
    return this
  }

  public withResponseType(type: Optional<string>): ResourceBuilder {
    this.resourceInput.response = { ...this.resourceInput.response, type }
    return this
  }

  public withResponseHeaders(headers: Record<string, string>): ResourceBuilder {
    this.resourceInput.response = { ...this.resourceInput.response, headers }
    return this
  }

  public withRandomTypes(): ResourceBuilder {
    return this.withRequestType(randomString('requestType')).withResponseType(randomString('responseType'))
  }

  public withRandomBodies(): ResourceBuilder {
    return this.withRequestBody(randomString('requestBody')).withResponseBody(randomString('responseBody'))
  }

  public build(): Resource {
    return {
      name: this.resourceInput.name,
      request: new Request(this.resourceInput.request),
      response: new Response(this.resourceInput.response),
    }
  }
}

interface ResourceInput {
  name: string
  request: RequestInput
  response: ResponseInput
}
