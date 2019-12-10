import TypeValidator from './type-validator'
import { Ajv, ValidateFunction, ErrorObject } from 'ajv'
import SchemaGenerator from './schema-loader'
import { Data } from '../types'
import Problem, { ProblemType } from '../problem'
import * as _problems from '../problem'
import * as _messages from '../messages'

jest.mock('../messages')
jest.mock('../problem')

describe('Type validator', () => {
  const ajv = mockObj<Ajv>({ compile: jest.fn() })
  const schemaGenerator = mockObj<SchemaGenerator>({ load: jest.fn() })
  const messages = mockObj(_messages)
  const problemCtor = (_problems as jest.Mocked<typeof _problems>).default
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
        const mappedProblem: Public<Problem> = { path: 'hello', problemType: ProblemType.Request }
        messages.shouldBe.mockReturnValue('yo')
        problemCtor.mockImplementation(() => mappedProblem as Problem)

        const problems = await typeValidator.getProblems(data, expectedType, ProblemType.Request)

        expect(messages.shouldBe).toBeCalledWith('type', expectedType, typeof data)
        expect(problemCtor).toBeCalledWith({ data, message: 'yo' })
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
