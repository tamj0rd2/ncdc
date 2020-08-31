import url from 'url'
import qs from 'qs'
import QueryString from 'qs'
import { compareQuery } from '~commands/serve/server/query-validator'
import { IncomingHttpHeaders } from 'http'
import { isDeeplyEqual } from '~util'

class Query {
  private readonly query: qs.ParsedQs | undefined

  constructor(queryString: string | null) {
    this.query = queryString === null ? undefined : qs.parse(queryString)
  }

  public matches = (queryToCompare: QueryString.ParsedQs): boolean => {
    if (!this.query) return true
    return compareQuery(this.query, queryToCompare)
  }
}

export class NcdcHeaders {
  private readonly headers: Record<string, string>

  constructor(headers?: Record<string, string>) {
    this.headers = headers ?? {}
  }

  public getAll = (): Record<string, string> => {
    return this.headers
  }

  public get = (header: string): string => {
    return this.headers[header]
  }

  public matches = (headersToCompare: IncomingHttpHeaders): boolean => {
    const expectedHeaders: Record<string, string> = {}
    for (const key in this.headers) {
      expectedHeaders[key.toLowerCase()] = this.headers[key]
    }

    const receivedHeaders: IncomingHttpHeaders = {}
    for (const key in headersToCompare) {
      receivedHeaders[key.toLowerCase()] = headersToCompare[key]
    }

    for (const key in expectedHeaders) {
      const expected = expectedHeaders[key]
      const received = receivedHeaders[key]
      const badResult = false

      if (expected.includes(',')) {
        if (!Array.isArray(received)) return badResult

        for (const item of expected.split(',')) {
          if (!received.includes(item)) return badResult
        }

        break
      }

      if (Array.isArray(received)) {
        if (!received?.includes(expected)) return badResult
      } else {
        if (received !== expected) return badResult
      }
    }

    return true
  }
}

interface RequestInput {
  method: SupportedMethod
  endpoint: string
  body: Data | undefined
  type: string | undefined
  headers: Record<string, string> | undefined
}

export class Body {
  private readonly isObject = typeof this.data === 'object'

  constructor(private readonly data: Data) {}

  public serialize(): string {
    return this.isObject ? JSON.stringify(this.data) : this.data?.toString()
  }

  public matches(bodyToCompare: unknown): boolean {
    return isDeeplyEqual(this.data, bodyToCompare)
  }

  public get(): Data {
    return this.data
  }

  public toString(): string {
    const shortenedBody = this.data?.toString().substr(0, 30)
    return `${shortenedBody}${shortenedBody && shortenedBody.length >= 30 ? '...' : ''}`
  }
}

export class Request {
  public readonly method: SupportedMethod
  public readonly endpoint: string
  public readonly pathName: string
  public readonly query: Query
  public readonly headers: NcdcHeaders
  public readonly type: string | undefined
  public readonly body: Body | undefined

  public constructor(input: RequestInput) {
    this.method = input.method
    this.endpoint = input.endpoint
    this.body = input.body ? new Body(input.body) : undefined
    this.type = input.type
    this.headers = new NcdcHeaders(input.headers)

    const { query, pathname } = url.parse(this.endpoint)
    this.query = new Query(query)

    if (!pathname) throw new Error(`No pathname for endpoint ${this.endpoint}`)
    this.pathName = pathname
  }

  public formatUrl = (baseUrl: string): string => {
    return `${baseUrl}${this.endpoint}`
  }

  public static CreateFromRequest = (request: Request): Request => {
    return new Request({
      endpoint: request.endpoint,
      method: request.method,
      body: request.body?.get(),
      headers: request.headers.getAll(),
      type: request.type,
    })
  }
}

interface ResponseInput {
  code: number
  body: Data | undefined
  type: string | undefined
  headers: Record<string, string> | undefined
}

export class Response {
  public readonly code: number
  public readonly body: Body | undefined
  public readonly type: string | undefined
  public readonly headers: NcdcHeaders

  constructor(input: ResponseInput) {
    this.code = input.code
    this.body = input.body ? new Body(input.body) : undefined
    this.type = input.type
    this.headers = new NcdcHeaders(input.headers)
  }

  public static CreateFromResponse = (response: Response): Response => {
    return new Response({
      code: response.code,
      body: response.body?.get(),
      headers: response.headers.getAll(),
      type: response.type,
    })
  }
}

export interface Resource {
  name: string
  request: Request
  response: Response
}

export enum SupportedMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export class ResourceBuilder {
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
