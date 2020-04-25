import url from 'url'
import qs from 'qs'
import { Query } from 'express-serve-static-core'

const isStringArray = (x: unknown): x is string[] => Array.isArray(x) && typeof x[0] === 'string'

const compareQuery = (expected: Query[number], actual: Query[number]): boolean => {
  if (typeof expected === 'string') {
    if (typeof actual === 'string') return expected === actual
    if (isStringArray(actual)) return actual.includes(expected)
    return false
  }

  if (isStringArray(expected)) {
    if (isStringArray(actual)) {
      const missingItem = expected.find((x) => !actual.includes(x))
      return !missingItem
    }
    return false
  }

  if (Array.isArray(expected)) {
    return false
  }

  if (typeof expected === 'object') {
    if (Array.isArray(actual) || typeof actual === 'string') return false

    for (const key in expected) {
      const expectedValue = expected[key]
      const actualValue = actual[key]
      if (!compareQuery(expectedValue, actualValue)) return false
    }

    return true
  }

  return false
}

// TODO: some kind of message should also be logged
const validateQuery = (endpoint: string, actualQuery: Query): boolean => {
  const configuredQueryString = url.parse(endpoint).query
  if (!configuredQueryString) return true

  const expectedQuery = qs.parse(configuredQueryString) as Query
  if (!expectedQuery) return true

  return compareQuery(expectedQuery, actualQuery)
}

export default validateQuery
