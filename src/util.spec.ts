import { isDeeplyEqual } from '~util'

jest.disableAutomock()

describe('isDeeplyEqual', () => {
  it('returns true when 2 strings are equal', () => {
    const str1 = 'hello  world  '
    const str2 = 'hello  world  '

    const result = isDeeplyEqual(str1, str2)

    expect(result).toBe(true)
  })

  it('returns false when 2 strings are not equal', () => {
    const str1 = 'hello  world  '
    const str2 = 'hello  world'

    const result = isDeeplyEqual(str1, str2)

    expect(result).toBe(false)
  })

  it('returns true when 2 objects are deeply equal', () => {
    const obj1 = { hello: ['to', 'the', { world: 'earth' }], cya: 'later', mate: 23 }
    const obj2 = { hello: ['to', 'the', { world: 'earth' }], cya: 'later', mate: 23 }

    const result = isDeeplyEqual(obj1, obj2)

    expect(result).toBe(true)
  })

  it('returns false when objects are not deeply equal', () => {
    const obj1 = { hello: ['to', 'the', { world: 'earth' }], cya: 'later', mate: 23 }
    const obj2 = { hello: 'world' }

    const result = isDeeplyEqual(obj1, obj2)

    expect(result).toBe(false)
  })
})
