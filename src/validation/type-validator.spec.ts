import TypeValidator, { TypeValidationFailure } from './type-validator'
import { Ajv, ValidateFunction, ErrorObject } from 'ajv'
import { SchemaRetriever } from '~schema'
import { mockObj, randomString, mockFn } from '~test-helpers'
import strip from 'strip-ansi'

jest.unmock('./type-validator')

describe('validate', () => {
  const validator = mockObj<Ajv>({ compile: jest.fn() })
  const schemaRetriever = mockObj<SchemaRetriever>({ load: jest.fn() })
  const typeValidator = new TypeValidator(validator, schemaRetriever)

  const body = randomString('body')
  const type = randomString('type')

  beforeEach(() => {
    validator.compile.mockReturnValue(jest.fn())
  })

  it('calls the schema retriver with the correct args', async () => {
    await typeValidator.validate(body, type)

    expect(schemaRetriever.load).toBeCalledWith(type)
  })

  it('creates a validator function using the correct args', async () => {
    const schema = { [randomString('key')]: randomString('value') }
    schemaRetriever.load.mockResolvedValue(schema)

    await typeValidator.validate(body, type)

    expect(validator.compile).toBeCalledWith(schema)
  })

  it('calls the validator func with the correct args', async () => {
    const body = randomString('body')
    const validateFn = mockFn<ValidateFunction>()
    validator.compile.mockReturnValue(validateFn)

    await typeValidator.validate(body, type)

    expect(validateFn).toBeCalledWith(body)
  })

  it('returns a success result if the type is valid', async () => {
    validator.compile.mockReturnValue(mockFn<ValidateFunction>().mockReturnValue(true))

    const result = await typeValidator.validate(body, type)

    expect(result.success).toBe(true)
  })

  it('returns validation messages if the type is invalid', async () => {
    const error1: Partial<ErrorObject> = {
      dataPath: randomString('.datapath1'),
      message: randomString('error-message1'),
    }
    const error2: Partial<ErrorObject> = {
      dataPath: '',
      message: randomString('error-message2'),
    }

    const validatorFn: ValidateFunction = mockFn<ValidateFunction>().mockReturnValue(false)
    validatorFn.errors = [error1, error2] as ErrorObject[]
    validator.compile.mockReturnValue(validatorFn)

    const result = (await typeValidator.validate(body, type)) as TypeValidationFailure

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(2)
    expect(strip(result.errors[0])).toBe(`<root>${error1.dataPath} ${error1.message}`)
    expect(strip(result.errors[1])).toBe(`<root> ${error2.message}`)
  })
})
