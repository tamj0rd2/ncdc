import QueryString from 'qs'
import qs from 'qs'
import { compareQuery } from '~commands/serve/server/query-validator'

export class Query {
  private readonly query: qs.ParsedQs | undefined

  constructor(queryString: string | null) {
    this.query = queryString === null ? undefined : qs.parse(queryString)
  }

  public matches = (queryToCompare: QueryString.ParsedQs): boolean => {
    if (!this.query) return true
    return compareQuery(this.query, queryToCompare)
  }
}
