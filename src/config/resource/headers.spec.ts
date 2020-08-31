import { NcdcHeaders } from './headers'

jest.disableAutomock()

describe('headers', () => {
  describe('matches', () => {
    it('returns true if the headers match the config', () => {
      const expected = new NcdcHeaders({
        'x-hello': 'world',
        'what-is': 'love',
        baby: 'dont,hurt,me',
      })

      const result = expected.matches({
        'X-Hello': 'world',
        'what-is': 'love',
        baby: ['dont', 'me', 'hurt'],
      })

      expect(result).toBe(true)
    })

    it('returns false if headers are missing', () => {
      const expected = new NcdcHeaders({
        hello: 'world',
        'what-is': 'love',
        baby: 'dont,hurt,me',
      })

      const result = expected.matches({
        Hello: 'world',
        'what-is': 'love',
        baby: ['dont', 'hurt'],
      })

      expect(result).toBe(false)
    })

    it('returns false if there are multiple received header values that do not match', () => {
      const expected = new NcdcHeaders({
        hello: 'world',
      })

      const result = expected.matches({
        hello: ['werld', 'peace'],
      })

      expect(result).toBe(false)
    })

    it('returns false if header values do not match case', () => {
      const expected = new NcdcHeaders({
        hello: 'world',
        'what-is': 'love',
        baby: 'dont,hurt,me',
      })

      const result = expected.matches({
        hello: 'world',
        'what-is': 'love',
        baby: ['dont', 'Hurt', 'me'],
      })

      expect(result).toBe(false)
    })

    describe('when an expected header is a comma separated value', () => {
      it('returns false when only a single header value is sent', () => {
        const expected = new NcdcHeaders({
          goodbye: 'cruel,world',
        })

        const result = expected.matches({
          goodbye: 'cruel',
        })

        expect(result).toBe(false)
      })

      it('returns false when they do not match', () => {
        const expected = new NcdcHeaders({
          goodbye: 'cruel,world',
        })

        const result = expected.matches({
          goodbye: ['cruel', 'orld'],
        })

        expect(result).toBe(false)
      })
    })

    describe('when expected is a single value', () => {
      it('returns true when actual is an array that contains the correct value', () => {
        const expected = new NcdcHeaders({
          hello: 'world',
        })

        const result = expected.matches({
          hello: ['sweet', 'world'],
        })

        expect(result).toBe(true)
      })

      it('returns true when actual is an array that does not contain the correct value', () => {
        const expected = new NcdcHeaders({
          hello: 'world',
        })

        const result = expected.matches({
          hello: ['sweet', 'gold'],
        })

        expect(result).toBe(false)
      })
    })
  })
})
