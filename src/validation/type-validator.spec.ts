import TypeValidator from './type-validator'
import { MapToProblem } from '../messages'
import { Ajv, ValidateFunction, ErrorObject } from 'ajv'
import SchemaGenerator from './schema-loader'
import { DetailedProblem, Data } from '../types'
import { validateLocaleAndSetLanguage } from 'typescript'

describe('Type validator', () => {
  const ajv = mockObj<Ajv>({ compile: jest.fn() })
  const schemaGenerator = mockObj<SchemaGenerator>({ load: jest.fn() })
  const mapToProblem: jest.MockedFunction<MapToProblem> = jest.fn()
  let typeValidator: TypeValidator

  beforeEach(() => {
    jest.resetAllMocks()
    typeValidator = new TypeValidator(ajv, schemaGenerator, mapToProblem)
  })

  describe('simple types', () => {
    const simpleFailCases: [string, Data][] = [
      ['string', 123],
      ['number', { age: 123 }],
      ['boolean', 'hello!'],
      ['object', false],
    ]

    it.each(simpleFailCases)('returns a problem when the data is not a valid %s', (expectedType, data) => {
      const mappedProblem: DetailedProblem = { dataPath: 'hello' }
      mapToProblem.mockReturnValue(mappedProblem)

      const problems = typeValidator.getProblems(data, expectedType)

      expect(mapToProblem).toBeCalledWith('type', expectedType, typeof data, data)
      expect(problems).toStrictEqual([mappedProblem])
    })

    const simpleSuccessCases: [string, Data][] = [
      ['string', '123'],
      ['number', 123],
      ['boolean', true],
      ['object', {}],
    ]

    it.each(simpleSuccessCases)('does not return anything the data is a valid %s', (expectedType, data) => {
      const problems = typeValidator.getProblems(data, expectedType)

      expect(mapToProblem).not.toBeCalled()
      expect(problems).toBeUndefined()
    })
  })

  describe('custom types', () => {
    it('does not return anything when the data is valid', () => {
      ajv.compile.mockReturnValue(jest.fn(() => true))

      const problems = typeValidator.getProblems([], 'CrazyType')

      expect(mapToProblem).not.toBeCalled()
      expect(problems).toBeUndefined()
    })

    it('does not return anything when there are no validation errors', () => {
      ajv.compile.mockReturnValue(jest.fn())

      const problems = typeValidator.getProblems([], 'CrazyType')

      expect(mapToProblem).not.toBeCalled()
      expect(problems).toBeUndefined()
    })

    it('returns problems when there are validation errors', () => {
      const validator: jest.MockedFunction<ValidateFunction> = jest.fn().mockReturnValue(false)
      const error1: Partial<ErrorObject> = {
        dataPath: '',
        data: 123,
        message: 'hey',
        parentSchema: { $schema: 'hi' },
      }
      const error2: Partial<ErrorObject> = {
        dataPath: 'name',
        data: { name: 'tam' },
        message: 'yo!',
        parentSchema: { $schema: 'yo' },
      }
      validator.errors = [error1 as ErrorObject, error2 as ErrorObject]
      ajv.compile.mockReturnValue(validator)

      const problems = typeValidator.getProblems({}, 'AnotherType')

      expect(problems).toStrictEqual([error1, error2])
    })
  })
})
