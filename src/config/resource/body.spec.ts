import { randomString } from '~test-helpers'
import { Body } from './body'

jest.disableAutomock()

describe('Body', () => {
  const urlEncodedContentType = 'application/x-www-form-urlencoded'

  describe('serialize', () => {
    describe('when the data is a string', () => {
      it('returns a string as-is if there is no contentType', () => {
        const rawData = randomString('rawData')
        const body = new Body(rawData)

        const result = body.serialize()

        expect(result).toEqual(rawData)
      })

      it('returns a form data string when the contentType is url encoded', () => {
        const body = new Body('hello=world&name=bob', urlEncodedContentType)

        const result = body.serialize()

        expect(result).toEqual('hello=world&name=bob')
      })
    })

    describe('when the data is an object', () => {
      it('returns stringified json when there in no contentType specified', () => {
        const rawData = { hello: 'world', name: 'bob' }
        const body = new Body(rawData)

        const result = body.serialize()

        expect(result).toEqual(JSON.stringify(rawData))
      })

      it('returns form data string when the contentType is url encoded', () => {
        const body = new Body({ hello: 'world', name: 'bob' }, urlEncodedContentType)

        const result = body.serialize()

        expect(result).toEqual('hello=world&name=bob')
      })
    })
  })

  describe('matches', () => {
    it('returns true when 2 strings are equal', () => {
      const str1 = 'hello  world  '
      const str2 = 'hello  world  '

      const result = new Body(str1).matches(str2)

      expect(result).toBe(true)
    })

    it('returns false when 2 strings are not equal', () => {
      const str1 = 'hello  world  '
      const str2 = 'hello  world'

      const result = new Body(str1).matches(str2)

      expect(result).toBe(false)
    })

    it('returns true when 2 objects are deeply equal', () => {
      const obj1 = { hello: ['to', 'the', { world: 'earth' }], cya: 'later', mate: 23 }
      const obj2 = { hello: ['to', 'the', { world: 'earth' }], cya: 'later', mate: 23 }

      const result = new Body(obj1).matches(obj2)

      expect(result).toBe(true)
    })

    it('returns false when objects are not deeply equal', () => {
      const obj1 = { hello: ['to', 'the', { world: 'earth' }], cya: 'later', mate: 23 }
      const obj2 = { hello: 'world' }

      const result = new Body(obj1).matches(obj2)

      expect(result).toBe(false)
    })

    describe('when the body is a urlencoded object', () => {
      it('returns true if the body matches', () => {
        const rawData = { hello: 'world' }
        const body = new Body(rawData, urlEncodedContentType)

        const result = body.matches({ hello: 'world' })

        expect(result).toBe(true)
      })

      it('returns false if the body does not match', () => {
        const rawData = { hello: 'world' }
        const body = new Body(rawData, urlEncodedContentType)

        const result = body.matches({ goodbye: 'world' })

        expect(result).toBe(false)
      })
    })

    describe('when given a url encoded string', () => {
      it('returns true if the body matches', () => {
        const rawData = 'hello=world'
        const body = new Body(rawData, urlEncodedContentType)

        const result = body.matches({ hello: 'world' })

        expect(result).toBe(true)
      })

      it('returns false if the body does not match', () => {
        const rawData = 'hello=world'
        const body = new Body(rawData, urlEncodedContentType)

        const result = body.matches({ goodbye: 'world' })

        expect(result).toBe(false)
      })
    })
  })
})
