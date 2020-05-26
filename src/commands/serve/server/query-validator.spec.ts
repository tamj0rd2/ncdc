import validateQuery from './query-validator'
import { randomString } from '~test-helpers'

jest.unmock('./query-validator')
jest.unmock('qs')
jest.unmock('url')

it('returns true if the query string contains a key value pair', () => {
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

it('is false if there are missing array keys', () => {
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
