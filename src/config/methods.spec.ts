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

    expect(schema.isValidSync(config)).toBe(true)
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

    expect(schema.isValidSync(config)).toBe(true)
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
    expect(() => schema.validateSync(config)).toThrow('birthday, greeting')
  })
})
