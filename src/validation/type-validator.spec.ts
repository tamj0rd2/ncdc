import TypeValidator from './type-validator'
import Ajv, { ValidateFunction } from 'ajv'
import { SchemaRetriever } from '~schema'
import { mockObj, randomString } from '~test-helpers'
import '../jest-extensions'
import { TypeBuilder } from '~config/resource/builders'

jest.disableAutomock()

describe('validate', () => {
  function createTestDeps() {
    const stubValidator = mockObj<Ajv>({ compile: jest.fn() })
    const stubValidateFn = mockObj<ValidateFunction>({})
    const stubSchemaRetriever = mockObj<SchemaRetriever>({ load: jest.fn() })
    const typeValidator = new TypeValidator(stubValidator, stubSchemaRetriever)

    return {
      stubValidator,
      stubSchemaRetriever,
      typeValidator,
      stubValidateFn,
      spyValidateFn: stubValidateFn,
    }
  }

  afterEach(() => jest.resetAllMocks())

  it('calls the schema retriver with the correct args', async () => {
    const { stubSchemaRetriever, typeValidator, stubValidator, stubValidateFn } = createTestDeps()
    const expectedType = TypeBuilder.random()
    stubValidator.compile.mockReturnValue(stubValidateFn)

    await typeValidator.assert(randomString('body'), expectedType)

    expect(stubSchemaRetriever.load).toBeCalledWith(expectedType)
  })

  it('creates a validator function using the correct args', async () => {
    const { stubSchemaRetriever, typeValidator, stubValidator, stubValidateFn } = createTestDeps()
    const schema = { [randomString('key')]: randomString('value') }
    stubSchemaRetriever.load.mockResolvedValue(schema)
    stubValidator.compile.mockReturnValue(stubValidateFn)

    await typeValidator.assert(randomString('body'), TypeBuilder.random())

    expect(stubValidator.compile).toBeCalledWith(schema)
  })

  it('calls the validator func with the correct args', async () => {
    const { typeValidator, stubValidator, stubValidateFn } = createTestDeps()
    stubValidator.compile.mockReturnValue(stubValidateFn)
    const expectedBody = randomString('body')

    await typeValidator.assert(expectedBody, TypeBuilder.random())

    expect(stubValidateFn).toBeCalledWith(expectedBody)
  })
})
