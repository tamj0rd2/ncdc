import validateQuery from './query-validator'
import { randomString } from '~test-helpers'
import qs from 'qs'

jest.unmock('./query-validator')
jest.unmock('qs')
jest.unmock('url')

it('returns true if the query string matches', () => {
  const endpoint = '/api/resource?greetings=greeting1&hello=world&greetings=greeting2'
  const requestQuery = { hello: 'world', greetings: ['greeting1', 'greeting2'] }

  const isValid = validateQuery(endpoint, requestQuery)

  expect(isValid).toBe(true)
})

it('returns true if the actual query string contains extra keys', () => {
  const endpoint = '/api/resource?greetings=greeting1&hello=world'
  const requestQuery = { hello: 'world', greetings: ['greeting2', 'greeting1'] }

  const isValid = validateQuery(endpoint, requestQuery)

  expect(isValid).toBe(true)
})

it('is false if there are missing keys', () => {
  const endpoint = '/api/resource?greetings=greeting1&hello=world'
  const requestQuery = { hello: 'world' }

  const isValid = validateQuery(endpoint, requestQuery)

  expect(isValid).toBe(false)
})

it('is false if there are missing array items', () => {
  const endpoint = '/api/resource?greetings=greeting1&greetings=greeting2'
  const requestQuery = { greetings: 'greeting2' }

  const isValid = validateQuery(endpoint, requestQuery)

  expect(isValid).toBe(false)
})

it('returns true if there was no query specified', () => {
  const endpoint = '/api/resource'

  const isValid = validateQuery(endpoint, {})

  expect(isValid).toBe(true)
})

it('returns true if there was no query specified but one was given', () => {
  const endpoint = '/api/resource'
  const requestQuery = { hello: 'world' }

  const isValid = validateQuery(endpoint, requestQuery)

  expect(isValid).toBe(true)
})

// unsupported anyway
it('returns true if an object matches deeply', () => {
  const endpoint = '/api/resource?hello[nested][item]=yo&hello[dog]=woof'
  const requestQuery = {
    hello: {
      nested: {
        item: 'yo',
      },
      dog: 'woof',
    },
  }

  const isValid = validateQuery(endpoint, requestQuery)

  expect(isValid).toBe(true)
})

// unsupported anyway
it('returns false if an object does not match deeply', () => {
  const endpoint = '/api/resource?hello[nested][item]=yo&hello[dog]=woof'
  const requestQuery = {
    hello: {
      nested: {
        item: 'yo',
      },
    },
    dog: 'woof',
  }

  const isValid = validateQuery(endpoint, requestQuery)

  expect(isValid).toBe(false)
})

// I'm not personally using this, so not supporting it yet
it('returns false for non-string arrays', () => {
  const queryString = qs.stringify({ items: [{ id: 1 }] }, { encode: false })
  const endpoint = `/api/resource?${queryString}`
  const query = { hello: randomString() }

  expect(validateQuery(endpoint, query)).toBe(false)
})

describe('comparing objects', () => {
  it('returns true if objects match', () => {
    const endpoint = `/api/resource?hello[name]=tam`
    const query = { hello: { name: 'tam' } }

    expect(validateQuery(endpoint, query)).toBe(true)
  })

  it('returns false if objects do not match', () => {
    const endpoint = `/api/resource?hello[name]=tam`
    const query = { hello: { name: 'flam' } }

    expect(validateQuery(endpoint, query)).toBe(false)
  })

  it('returns false if object is missing keys', () => {
    const endpoint = `/api/resource?hello[name]=tam`
    const query = {}

    expect(validateQuery(endpoint, query)).toBe(false)
  })
})

describe('wildcard queries', () => {
  it('returns true for any value', () => {
    const endpoint = '/api/resource?hello=*'
    const query = { hello: randomString() }

    expect(validateQuery(endpoint, query)).toBe(true)
  })

  it('returns false if an expected value is undefined', () => {
    const endpoint = '/api/resource?hello=*'
    const query = {}

    expect(validateQuery(endpoint, query)).toBe(false)
  })

  it('returns true for an array of any values', () => {
    const endpoint = '/api/resource?hello=*'
    const query = { hello: [randomString(), randomString()] }

    expect(validateQuery(endpoint, query)).toBe(true)
  })
})
