import TypeValidator from './type-validator'
import { Ajv, ValidateFunction, ErrorObject } from 'ajv'
import { SchemaRetriever } from '~schema'
import { mockObj, randomString, mockFn } from '~test-helpers'
import '../jest-extensions'

jest.disableAutomock()

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

    await typeValidator.assert(randomString('body'), expectedType)

    expect(stubSchemaRetriever.load).toBeCalledWith(expectedType)
  })

  it('creates a validator function using the correct args', async () => {
    const { stubSchemaRetriever, typeValidator, stubValidator } = createTestDeps()
    const schema = { [randomString('key')]: randomString('value') }
    stubSchemaRetriever.load.mockResolvedValue(schema)
    stubValidator.compile.mockReturnValue(jest.fn())

    await typeValidator.assert(randomString('body'), randomString('type'))

    expect(stubValidator.compile).toBeCalledWith(schema)
  })

  it('calls the validator func with the correct args', async () => {
    const { typeValidator, stubValidator } = createTestDeps()
    const validateFn = mockFn<ValidateFunction>()
    stubValidator.compile.mockReturnValue(validateFn)
    const expectedBody = randomString('body')

    await typeValidator.assert(expectedBody, randomString('type'))

    expect(validateFn).toBeCalledWith(expectedBody)
  })

  it('does not throw if the data does match the type', async () => {
    const { typeValidator, stubValidator } = createTestDeps()
    stubValidator.compile.mockReturnValue(mockFn<ValidateFunction>().mockReturnValue(true))

    await typeValidator.assert(randomString('body'), randomString('type'))
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

    const body = randomString('body')
    const type = randomString('type')

    await expect(typeValidator.assert(body, type)).rejects.toThrowColouredError(
      `<root>${error1.dataPath} ${error1.message}\n<root> ${error2.message}`,
    )
  })
})
