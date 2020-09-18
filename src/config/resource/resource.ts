import { NcdcHeaders } from './headers'
import { Body } from './body'
import { SupportedMethod } from './method'
import { Request } from './request'
import { Response } from './response'

export interface Resource {
  name: string
  request: Request
  response: Response
}

export class ResourceBuilder {
  public static random(): Resource {
    return new ResourceBuilder().build()
  }

  /** @deprecated use ResourceBuilder.random() */
  public static get Default(): Resource {
    return ResourceBuilder.random()
  }

  private resource: Resource = {
    name: 'Test',
    request: new Request({
      endpoint: '/api/resource',
      method: SupportedMethod.GET,
      body: undefined,
      headers: undefined,
      type: undefined,
    }),
    response: new Response({ code: 200, body: 'Hello, world!', headers: undefined, type: undefined }),
  }

  public withName(name: string): ResourceBuilder {
    this.resource.name = name
    return this
  }

  public withEndpoint(endpoint: string): ResourceBuilder {
    this.resource.request = Request.CreateFromRequest({ ...this.resource.request, endpoint })
    return this
  }

  public withMethod(method: SupportedMethod): ResourceBuilder {
    this.resource.request = Request.CreateFromRequest({ ...this.resource.request, method })
    return this
  }

  public withRequestType(type: string): ResourceBuilder {
    this.resource.request = Request.CreateFromRequest({ ...this.resource.request, type })
    return this
  }

  public withRequestBody(body: Data): ResourceBuilder {
    this.resource.request = Request.CreateFromRequest({ ...this.resource.request, body: new Body(body) })
    return this
  }

  public withRequestHeaders(headers: Record<string, string>): ResourceBuilder {
    this.resource.request = Request.CreateFromRequest({
      ...this.resource.request,
      headers: new NcdcHeaders(headers),
    })
    return this
  }

  public withResponseCode(code: number): ResourceBuilder {
    this.resource.response = Response.CreateFromResponse({ ...this.resource.response, code })
    return this
  }

  public withResponseBody(body: Optional<Data>): ResourceBuilder {
    this.resource.response = Response.CreateFromResponse({
      ...this.resource.response,
      body: body ? new Body(body) : undefined,
    })
    return this
  }

  public withResponseType(type: Optional<string>): ResourceBuilder {
    this.resource.response = Response.CreateFromResponse({ ...this.resource.response, type })
    return this
  }

  public withResponseHeaders(headers: Record<string, string>): ResourceBuilder {
    this.resource.response = Response.CreateFromResponse({
      ...this.resource.response,
      headers: new NcdcHeaders(headers),
    })
    return this
  }

  public build(): Resource {
    return this.resource
  }
}
