import TypeValidator, { TypeValidationFailure } from './type-validator'
import { Ajv, ValidateFunction, ErrorObject } from 'ajv'
import { SchemaGenerator, SchemaRetriever } from '~schema'
import Problem, { ProblemType } from '~problem'
import * as _messages from '~messages'
import { mockObj, mockCtor, randomString, mockFn } from '~test-helpers'
import strip from 'strip-ansi'

jest.unmock('./type-validator')

describe('Type validator', () => {
  const ajv = mockObj<Ajv>({ compile: jest.fn() })
  const schemaGenerator = mockObj<SchemaGenerator>({ load: jest.fn() })
  const messages = mockObj(_messages)
  const problemCtor = mockCtor(Problem)
  let typeValidator: TypeValidator

  beforeEach(() => {
    jest.resetAllMocks()
    typeValidator = new TypeValidator(ajv, schemaGenerator)
  })

  afterAll(() => jest.clearAllMocks())

  describe('simple types', () => {
    const simpleFailCases: [string, Data][] = [
      ['string', 123],
      ['number', { age: 123 }],
      ['boolean', 'hello!'],
      ['object', false],
    ]

    it.each(simpleFailCases)(
      'returns a problem when the data is not a valid %s',
      async (expectedType, data) => {
        const mappedProblem: Public<Problem> = {
          path: 'hello',
          problemType: ProblemType.Request,
          message: 'hi',
          // showValue: true,
          // showSchema: true,
        }
        messages.shouldBe.mockReturnValue('yo')
        problemCtor.mockImplementation(() => mappedProblem as Problem)

        const problems = await typeValidator.getProblems(data, expectedType, ProblemType.Request)

        expect(messages.shouldBe).toBeCalledWith('type', expectedType, typeof data)
        expect(problemCtor).toBeCalledWith({ data, message: 'yo' }, ProblemType.Request)
        expect(problems).toStrictEqual([mappedProblem])
      },
    )

    const simpleSuccessCases: [string, Data][] = [
      ['string', '123'],
      ['number', 123],
      ['boolean', true],
      ['object', {}],
    ]

    it.each(simpleSuccessCases)(
      'does not return anything when the data is a valid %s',
      async (expectedType, data) => {
        const problems = await typeValidator.getProblems(data, expectedType, ProblemType.Response)

        expect(problemCtor).not.toBeCalled()
        expect(problems).toBeUndefined()
      },
    )
  })

  describe('custom types', () => {
    it('does not return anything when the data is valid', async () => {
      ajv.compile.mockReturnValue(jest.fn(() => true))

      const problems = await typeValidator.getProblems([], 'CrazyType', ProblemType.Request)

      expect(problemCtor).not.toBeCalled()
      expect(problems).toBeUndefined()
    })

    it('does not return anything when there are no validation errors', async () => {
      ajv.compile.mockReturnValue(jest.fn())

      const problems = await typeValidator.getProblems([], 'CrazyType', ProblemType.Response)

      expect(problemCtor).not.toBeCalled()
      expect(problems).toBeUndefined()
    })

    it('returns problems when there are validation errors', async () => {
      const validator: jest.MockedFunction<ValidateFunction> = jest.fn().mockReturnValue(false)
      const error1: Partial<ErrorObject> = {
        message: 'hey',
      }
      const error2: Partial<ErrorObject> = {
        message: 'yo!',
      }
      validator.errors = [error1 as ErrorObject, error2 as ErrorObject]
      ajv.compile.mockReturnValue(validator)
      problemCtor
        .mockImplementationOnce(() => error1 as Problem)
        .mockImplementationOnce(() => error2 as Problem)

      const problems = await typeValidator.getProblems({}, 'AnotherType', ProblemType.Request)

      expect(problems).toStrictEqual([error1, error2])
    })
  })
})

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
