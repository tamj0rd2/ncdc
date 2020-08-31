import { randomString } from '~test-helpers'
import qs, { ParsedQs } from 'qs'
import { Query } from './query'

jest.disableAutomock()

describe('Query', () => {
  describe('matches', () => {
    const matchesQuery = (queryString: string | null, compare: ParsedQs) =>
      new Query(queryString).matches(compare)

    it('returns true if the query string matches', () => {
      const queryString = 'greetings=greeting1&hello=world&greetings=greeting2'
      const queryToCompare = { hello: 'world', greetings: ['greeting1', 'greeting2'] }

      const isValid = matchesQuery(queryString, queryToCompare)

      expect(isValid).toBe(true)
    })

    it('returns true if the actual query string contains extra keys', () => {
      const queryString = 'greetings=greeting1&hello=world'
      const queryToCompare = { hello: 'world', greetings: ['greeting2', 'greeting1'] }

      const isValid = matchesQuery(queryString, queryToCompare)

      expect(isValid).toBe(true)
    })

    it('is false if there are missing keys', () => {
      const queryString = 'greetings=greeting1&hello=world'
      const queryToCompare = { hello: 'world' }

      const isValid = matchesQuery(queryString, queryToCompare)

      expect(isValid).toBe(false)
    })

    it('is false if there are missing array items', () => {
      const queryString = 'greetings=greeting1&greetings=greeting2'
      const queryToCompare = { greetings: 'greeting2' }

      const isValid = matchesQuery(queryString, queryToCompare)

      expect(isValid).toBe(false)
    })

    it('returns true if there was no query specified', () => {
      const isValid = matchesQuery(null, {})

      expect(isValid).toBe(true)
    })

    it('returns true if there was no query specified but one was given', () => {
      const queryToCompare = { hello: 'world' }

      const isValid = matchesQuery(null, queryToCompare)

      expect(isValid).toBe(true)
    })

    // unsupported anyway
    it('returns true if an object matches deeply', () => {
      const queryString = 'hello[nested][item]=yo&hello[dog]=woof'
      const queryToCompare = {
        hello: {
          nested: {
            item: 'yo',
          },
          dog: 'woof',
        },
      }

      const isValid = matchesQuery(queryString, queryToCompare)

      expect(isValid).toBe(true)
    })

    // unsupported anyway
    it('returns false if an object does not match deeply', () => {
      const queryString = 'hello[nested][item]=yo&hello[dog]=woof'
      const queryToCompare = {
        hello: {
          nested: {
            item: 'yo',
          },
        },
        dog: 'woof',
      }

      const isValid = matchesQuery(queryString, queryToCompare)

      expect(isValid).toBe(false)
    })

    // I'm not personally using this, so not supporting it yet
    it('returns false for non-string arrays', () => {
      const queryString = qs.stringify({ items: [{ id: 1 }] }, { encode: false })
      const queryToCompare = { hello: randomString() }

      expect(matchesQuery(queryString, queryToCompare)).toBe(false)
    })

    describe('comparing objects', () => {
      it('returns true if objects match', () => {
        const queryString = `hello[name]=tam`
        const queryToCompare = { hello: { name: 'tam' } }

        expect(matchesQuery(queryString, queryToCompare)).toBe(true)
      })

      it('returns false if objects do not match', () => {
        const queryString = `hello[name]=tam`
        const queryToCompare = { hello: { name: 'flam' } }

        expect(matchesQuery(queryString, queryToCompare)).toBe(false)
      })

      it('returns false if object is missing keys', () => {
        const queryString = `hello[name]=tam`
        const queryToCompare = {}

        expect(matchesQuery(queryString, queryToCompare)).toBe(false)
      })
    })

    describe('wildcard queries', () => {
      it('returns true for any value', () => {
        const queryString = 'hello=*'
        const queryToCompare = { hello: randomString() }

        expect(matchesQuery(queryString, queryToCompare)).toBe(true)
      })

      it('returns false if an expected value is undefined', () => {
        const queryString = 'hello=*'
        const queryToCompare = {}

        expect(matchesQuery(queryString, queryToCompare)).toBe(false)
      })

      it('returns true for an array of any values', () => {
        const queryString = 'hello=*'
        const queryToCompare = { hello: [randomString(), randomString()] }

        expect(matchesQuery(queryString, queryToCompare)).toBe(true)
      })
    })
  })
})
