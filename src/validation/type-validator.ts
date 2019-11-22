import { Ajv } from 'ajv'
import SchemaGenerator from './schema-loader'
import { GetComparisonMessage } from '../messages'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = any

export interface TypeProblem {
  dataPath: string
  expectedType: string
  actualType: string
  data: Data
}

export default class TypeValidator {
  constructor(
    private readonly validator: Ajv,
    private readonly schemaGenerator: SchemaGenerator,
    private readonly getComparisonMessage: GetComparisonMessage,
  ) {}

  public getValidationErrors(data: Data, expectedType: string): (string | TypeProblem[]) | undefined {
    const actualType = typeof data
    switch (expectedType) {
      case 'string':
        if (actualType !== 'string') return this.getComparisonMessage('type', 'string', actualType)
        break
      case 'number':
        if (actualType !== 'number') return this.getComparisonMessage('type', 'number', actualType)
        break
      case 'boolean':
        if (actualType !== 'boolean') return this.getComparisonMessage('type', 'boolean', actualType)
        break
      case 'object':
        if (actualType !== 'object') return this.getComparisonMessage('type', 'object', actualType)
        break
      default: {
        const jsonSchema = this.schemaGenerator.load(expectedType)
        const validator = this.validator.compile(jsonSchema)
        const isValid = validator(data)

        if (isValid || !validator.errors) return
        return validator.errors.map(({ dataPath, schema: expectedType, data }) => ({
          dataPath,
          expectedType,
          actualType,
          data,
        }))
      }
    }
  }
}
