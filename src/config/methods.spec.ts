import { string, number, object } from 'yup'
import enrichYup from './methods'

enrichYup()

describe('allowedKeysOnly', () => {
  it('is valid when specified keys are used', () => {
    const schema = object().allowedKeysOnly().shape({
      name: string(),
      age: number(),
    })

    const config = {
      name: 'Name',
      age: 100,
    }

    expect(() => schema.validateSync(config)).not.toThrowError()
  })

  it('is invalid when unspecified keys are used ', () => {
    const schema = object()
      .shape({
        name: string(),
        age: number(),
      })
      .allowedKeysOnly()

    const config = {
      name: 'Name',
      age: 100,
      birthday: 'None of your business',
      greeting: {
        woah: 'dude',
      },
    }

    expect(schema.isValidSync(config)).toBe(false)
    expect(() => schema.validateSync(config)).toThrowError('birthday, greeting')
  })

  it('is valid when specified keys are used in nested objects', () => {
    const schema = object()
      .shape({
        stuff: object()
          .shape({
            name: string(),
            age: number(),
          })
          .allowedKeysOnly(),
      })
      .allowedKeysOnly()

    const config = {
      stuff: {
        name: 'Name',
        age: 100,
      },
    }

    expect(() => schema.validateSync(config)).not.toThrowError()
  })

  it('it is invalid when unspecified keys are used in nested objects', () => {
    const schema = object()
      .shape({
        stuff: object()
          .shape({
            name: string(),
            age: number(),
          })
          .allowedKeysOnly(),
      })
      .allowedKeysOnly()

    const config = {
      stuff: {
        name: 'Name',
        age: 100,
        birthday: 'None of your business',
        greeting: {
          woah: 'dude',
        },
      },
    }

    expect(schema.isValidSync(config)).toBe(false)
    expect(() => schema.validateSync(config)).toThrow(/stuff contains .* birthday, greeting/)
  })

  it('is valid when an unspecified key is present but has been ignored', () => {
    const schema = object()
      .shape({
        name: string(),
        age: number(),
      })
      .allowedKeysOnly('language')

    const config = {
      name: 'Name',
      age: 100,
      language: 'english',
    }

    expect(() => schema.validateSync(config)).not.toThrowError()
  })

  it('strips keys that are unspecified and ignored', () => {
    const schema = object()
      .shape({
        name: string(),
        age: number(),
      })
      .allowedKeysOnly('language')

    const config = {
      name: 'Name',
      age: 100,
      language: 'english',
    }

    expect(() => schema.validateSync(config)).not.toThrowError()
    expect(schema.validateSync(config)).not.toHaveProperty('language')
  })
})

describe('requiredIf', () => {
  const schema = object().shape({
    endpoint: string().requiredIfNoSiblings('mockEndpoint'),
    mockEndpoint: string().requiredIfNoSiblings('endpoint'),
  })

  it('is true if both options are specified', () => {
    const config = {
      endpoint: 'hello',
      mockEndpoint: 'world',
    }

    expect(() => schema.validateSync(config)).not.toThrowError()
  })

  it('is true if one option is specified', () => {
    const config = {
      mockEndpoint: 'hello',
    }

    expect(() => schema.validateSync(config)).not.toThrowError()
  })

  it('is false if neither option is specified', () => {
    const config = {}

    expect(schema.isValidSync(config)).toBe(false)
  })
})

describe('notAllowedIf', () => {
  const schema = object().shape({
    hello: string().notAllowedIfSiblings('world'),
    world: string().notAllowedIfSiblings('hello'),
    nice: string().notAllowedIfSiblings('hello', 'world'),
  })

  it.each(['hello', 'world', 'nice'])('is valid if only %s key is specified', (key) => {
    const config = {
      [key]: key,
    }

    expect(() => schema.validateSync(config)).not.toThrowError()
  })

  it('throws if hello and world are specified', () => {
    const config = {
      hello: 'hello',
      world: 'world',
    }

    expect(() => schema.validateSync(config)).toThrowError()
  })

  it('it throws if hello or world are specified with nice', () => {
    const config = {
      hello: 'hello',
      world: 'world',
      nice: 'nice',
    }

    expect(() => schema.validateSync(config)).toThrowError(/nice is not allowed .* hello, world/)
  })
})

describe('startsWith', () => {
  it('does not throw when starts with specified substring', () => {
    const schema = string().startsWith('hello')

    expect(() => schema.validateSync('hello world')).not.toThrowError()
  })

  it('does throw when does not start with specified substring', () => {
    const schema = string().startsWith('hello')

    expect(() => schema.validateSync('yellow world')).toThrowError('this should start with hello')
  })
})

describe('ofHeaders', () => {
  const schema = object().ofHeaders()

  it('does not throw when headers are valid types', async () => {
    const headers = {
      header1: 'value1',
      header2: ['woah', 'dude'],
      header3: undefined,
    }

    expect(() => schema.validateSync(headers)).not.toThrowError()
  })

  const invalidHeaderCases: object[][] = [
    [{ key: true }],
    [{ key: 123 }],
    [{ key: [123, 'abc'] }],
    [{ key: ['abc', false] }],
    [{ key: { hello: 'world' } }],
  ]

  it.each(invalidHeaderCases)('throws an error when headers are invalid %s', async (headers) => {
    await expect(schema.validate(headers)).rejects.toThrowError('object.key should be of type:')
  })
})
