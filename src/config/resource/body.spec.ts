import { Body } from './body'

jest.disableAutomock()

describe('Body', () => {
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
      const obj1 = {
        hello: ['to', 'the', { world: 'earth' }],
        cya: 'later',
        mate: 23,
      }
      const obj2 = {
        hello: ['to', 'the', { world: 'earth' }],
        cya: 'later',
        mate: 23,
      }

      const result = new Body(obj1).matches(obj2)

      expect(result).toBe(true)
    })

    it('returns false when objects are not deeply equal', () => {
      const obj1 = {
        hello: ['to', 'the', { world: 'earth' }],
        cya: 'later',
        mate: 23,
      }
      const obj2 = { hello: 'world' }

      const result = new Body(obj1).matches(obj2)

      expect(result).toBe(false)
    })
  })

  describe('serialize', () => {
    it('returns form data when header is url encoded', () => {
      const result = new Body(
        { hello: 'world', name: 'bob' },
        'application/x-www-form-urlencoded',
      ).serialize()

      expect(result).toBe('hello=world&name=bob')
    })
  })
})
