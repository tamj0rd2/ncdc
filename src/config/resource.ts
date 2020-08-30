import url from 'url'
import qs from 'qs'
import QueryString from 'qs'
import { compareQuery } from '~commands/serve/server/query-validator'
import { SupportedMethod } from './types'

class Query {
  private readonly query: qs.ParsedQs | undefined

  constructor(queryString: string | null) {
    this.query = queryString === null ? undefined : qs.parse(queryString)
  }

  public matches(queryToCompare: QueryString.ParsedQs): boolean {
    if (!this.query) return true
    return compareQuery(this.query, queryToCompare)
  }
}

interface RequestInput {
  method: SupportedMethod
  endpoint: string
  body?: Data
  type?: string
  headers?: NcdcHeaders
}

export class Request {
  public readonly method: SupportedMethod
  public readonly endpoint: string
  public readonly pathName: string
  public readonly query: Query
  public readonly headers?: NcdcHeaders
  public readonly type?: string
  public readonly body?: Data

  public constructor(input: RequestInput) {
    this.method = input.method
    this.endpoint = input.endpoint
    this.body = input.body
    this.type = input.type
    this.headers = input.headers

    const { query, pathname } = url.parse(this.endpoint)
    this.query = new Query(query)

    if (!pathname) throw new Error(`No pathname for endpoint ${this.endpoint}`)
    this.pathName = pathname
  }

  public formatUrl(baseUrl: string): string {
    return `${baseUrl}${this.endpoint}`
  }
}
