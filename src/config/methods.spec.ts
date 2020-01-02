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
})

describe('requiredIf', () => {
  const schema = yup.object().shape({
    endpoint: yup.string().requiredIf('mockEndpoint', mockEndpoint => !mockEndpoint),
    mockEndpoint: yup.string().requiredIf('endpoint', endpoint => endpoint === undefined),
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
    hello: yup.string().notAllowedIf<string>('world', world => !!world),
    world: yup.string().notAllowedIf<string>('hello', hello => !!hello),
  })

  it('throws if both options are specified', () => {
    const config = {
      hello: 'hello',
      world: 'world',
    }

    expect(() => schema.validateSync(config)).toThrowError()
  })

  it('is valid if one option is specified', () => {
    const config = {
      world: 'hello',
    }

    expect(() => schema.validateSync(config)).not.toThrowError()
  })

  it('is valid if neither option is specified', () => {
    const config = {}

    expect(() => schema.validateSync(config)).not.toThrowError()
  })
})
