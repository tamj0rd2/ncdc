import qs, { ParsedQs } from 'qs'
import { Query as ExpressQuery } from 'express-serve-static-core'

const isStringArray = (x: unknown): x is string[] => Array.isArray(x) && typeof x[0] === 'string'

const isParsedQs = (x: unknown): x is ParsedQs => {
  if (typeof x !== 'object') return false
  if (Array.isArray(x)) return false
  return !!x
}

export class Query {
  private readonly query: ParsedQs | undefined

  constructor(queryString: string | null) {
    this.query = queryString === null ? undefined : qs.parse(queryString)
  }

  public matches = (queryToCompare: ParsedQs): boolean => {
    if (!this.query) return true
    return this.compareQuery(this.query, queryToCompare)
  }

  private compareQuery(expected: ExpressQuery[number], actual: ExpressQuery[number]): boolean {
    if (typeof expected === 'string') {
      if (typeof actual === 'string') {
        if (expected === '*' && actual !== undefined) return true
        return expected === actual
      }

      if (isStringArray(actual)) {
        return expected === '*' || actual.includes(expected)
      }

      return false
    }

    if (isStringArray(expected)) {
      if (isStringArray(actual)) {
        const missingItem = expected.find((x) => !actual.includes(x))
        return !missingItem
      }
      return false
    }

    if (isParsedQs(expected) && isParsedQs(actual)) {
      for (const key in expected) {
        const expectedValue = expected[key]
        const actualValue = actual[key]
        if (!this.compareQuery(expectedValue, actualValue)) return false
      }

      return true
    }

    return false
  }
}
