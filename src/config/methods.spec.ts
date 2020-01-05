import * as yup from 'yup'
import './methods'

describe('allowedKeysOnly', () => {
  it('is valid when specified keys are used', () => {
    const schema = yup
      .object()
      .allowedKeysOnly()
      .shape({
        name: yup.string(),
        age: yup.number(),
      })

    const config = {
      name: 'Name',
      age: 100,
    }

    expect(() => schema.validateSync(config)).not.toThrowError()
  })

  it('is invalid when unspecified keys are used ', () => {
    const schema = yup
      .object()
      .shape({
        name: yup.string(),
        age: yup.number(),
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
    const schema = yup
      .object()
      .shape({
        stuff: yup
          .object()
          .shape({
            name: yup.string(),
            age: yup.number(),
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
    const schema = yup
      .object()
      .shape({
        stuff: yup
          .object()
          .shape({
            name: yup.string(),
            age: yup.number(),
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
    const schema = yup
      .object()
      .shape({
        name: yup.string(),
        age: yup.number(),
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
    const schema = yup
      .object()
      .shape({
        name: yup.string(),
        age: yup.number(),
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
  const schema = yup.object().shape({
    endpoint: yup.string().requiredIfNoSiblings('mockEndpoint'),
    mockEndpoint: yup.string().requiredIfNoSiblings('endpoint'),
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
  const schema = yup.object().shape({
    hello: yup.string().notAllowedIfSiblings('world'),
    world: yup.string().notAllowedIfSiblings('hello'),
    nice: yup.string().notAllowedIfSiblings('hello', 'world'),
  })

  it.each(['hello', 'world', 'nice'])('is valid if only %s key is specified', key => {
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
    const schema = yup.string().startsWith('hello')

    expect(() => schema.validateSync('hello world')).not.toThrowError()
  })

  it('does throw when does not start with specified substring', () => {
    const schema = yup.string().startsWith('hello')

    expect(() => schema.validateSync('yellow world')).toThrowError(
      'value of this should start with hello but received yellow world',
    )
  })
})
