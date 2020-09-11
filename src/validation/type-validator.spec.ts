import TypeValidator, { TypeValidationFailure } from './type-validator'
import { Ajv, ValidateFunction, ErrorObject } from 'ajv'
import { SchemaRetriever } from '~schema'
import { mockObj, randomString, mockFn } from '~test-helpers'
import strip from 'strip-ansi'

jest.unmock('./type-validator')

describe('validate', () => {
  function createTestDeps() {
    const stubValidator = mockObj<Ajv>({ compile: jest.fn() })
    const stubSchemaRetriever = mockObj<SchemaRetriever>({ load: jest.fn() })
    const typeValidator = new TypeValidator(stubValidator, stubSchemaRetriever)

    return {
      stubValidator,
      stubSchemaRetriever,
      typeValidator,
    }
  }

  // const body = randomString('body')
  // const type = randomString('type')

  beforeEach(() => {
    // validator.compile.mockReturnValue(jest.fn())
  })

  afterEach(() => jest.resetAllMocks())

  it('calls the schema retriver with the correct args', async () => {
    const { stubSchemaRetriever, typeValidator, stubValidator } = createTestDeps()
    const expectedType = randomString('type')
    stubValidator.compile.mockReturnValue(jest.fn())

    await typeValidator.validate(randomString('body'), expectedType)

    expect(stubSchemaRetriever.load).toBeCalledWith(expectedType)
  })

  it('creates a validator function using the correct args', async () => {
    const { stubSchemaRetriever, typeValidator, stubValidator } = createTestDeps()
    const schema = { [randomString('key')]: randomString('value') }
    stubSchemaRetriever.load.mockResolvedValue(schema)
    stubValidator.compile.mockReturnValue(jest.fn())

    await typeValidator.validate(randomString('body'), randomString('type'))

    expect(stubValidator.compile).toBeCalledWith(schema)
  })

  it('calls the validator func with the correct args', async () => {
    const { typeValidator, stubValidator } = createTestDeps()
    const validateFn = mockFn<ValidateFunction>()
    stubValidator.compile.mockReturnValue(validateFn)
    const expectedBody = randomString('body')

    await typeValidator.validate(expectedBody, randomString('type'))

    expect(validateFn).toBeCalledWith(expectedBody)
  })

  it('returns a success result if the data does match the type', async () => {
    const { typeValidator, stubValidator } = createTestDeps()
    stubValidator.compile.mockReturnValue(mockFn<ValidateFunction>().mockReturnValue(true))

    const result = await typeValidator.validate(randomString('body'), randomString('type'))

    expect(result.success).toBe(true)
  })

  it('returns validation messages if the data does not match the type', async () => {
    const { typeValidator, stubValidator } = createTestDeps()
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
    stubValidator.compile.mockReturnValue(validatorFn)

    const result = (await typeValidator.validate(
      randomString('body'),
      randomString('type'),
    )) as TypeValidationFailure

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(2)
    expect(strip(result.errors[0])).toBe(`<root>${error1.dataPath} ${error1.message}`)
    expect(strip(result.errors[1])).toBe(`<root> ${error2.message}`)
  })
})
