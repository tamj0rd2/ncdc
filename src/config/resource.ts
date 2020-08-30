import url from 'url'
import qs from 'qs'
import QueryString from 'qs'
import { compareQuery } from '~commands/serve/server/query-validator'
import { SupportedMethod } from './types'
import { IncomingHttpHeaders } from 'http'

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

export class Request {
  public readonly method: SupportedMethod
  public readonly endpoint: string
  public readonly pathName: string
  public readonly query: Query
  public readonly headers: NcdcHeaders
  public readonly type?: string
  public readonly body?: Data

  public constructor(input: RequestInput) {
    this.method = input.method
    this.endpoint = input.endpoint
    this.body = input.body
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
      body: request.body,
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
  public readonly body?: Data
  public readonly type?: string
  public readonly headers: NcdcHeaders

  constructor(input: ResponseInput) {
    this.code = input.code
    this.body = input.body
    this.type = input.type
    this.headers = new NcdcHeaders(input.headers)
  }

  public static CreateFromResponse = (response: Response): Response => {
    return new Response({
      code: response.code,
      body: response.body,
      headers: response.headers.getAll(),
      type: response.type,
    })
  }
}
