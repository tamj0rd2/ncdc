import { SupportedMethod } from './method'
import { Query } from './query'
import { NcdcHeaders } from './headers'
import { Body } from './body'
import url from 'url'

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
  public readonly type: string | undefined
  public readonly body: Body | undefined

  public constructor(input: RequestInput) {
    this.method = input.method
    this.endpoint = input.endpoint
    this.headers = new NcdcHeaders(input.headers)
    this.body = input.body ? new Body(input.body, this.headers.get('content-type')) : undefined
    this.type = input.type

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
