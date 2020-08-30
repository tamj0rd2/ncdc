import url from 'url'
import qs from 'qs'
import QueryString from 'qs'
import { compareQuery } from '~commands/serve/server/query-validator'

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

export class Endpoint {
  public readonly pathName: string
  public readonly query: Query

  constructor(private readonly endpoint: string) {
    const { query, pathname } = url.parse(endpoint)
    this.query = new Query(query)

    if (!pathname) throw new Error(`No pathname for endpoint ${endpoint}`)
    this.pathName = pathname
  }

  public toString(): string {
    return this.endpoint
  }

  public getFullUrl(baseUrl: string): string {
    return `${baseUrl}${this.endpoint}`
  }
}
