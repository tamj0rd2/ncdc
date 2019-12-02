import { Ajv } from 'ajv'
import SchemaGenerator from './schema-loader'
import { Data } from '../types'
import Problem from '../problem'
import { shouldBe } from '../messages'

export default class TypeValidator {
  constructor(private readonly validator: Ajv, private readonly schemaGenerator: SchemaGenerator) {}

  public async getProblems(data: Data, expectedType: string): Promise<Optional<Problem[]>> {
    switch (expectedType) {
      case 'string':
        return this.mapSimpleProblem('string', data)
      case 'number':
        return this.mapSimpleProblem('number', data)
      case 'boolean':
        return this.mapSimpleProblem('boolean', data)
      case 'object':
        return this.mapSimpleProblem('object', data)
      default:
        const jsonSchema = this.schemaGenerator.load(expectedType)
        const validator = this.validator.compile(jsonSchema)
        const isValid = validator(data)

        if (isValid || !validator.errors) return
        return validator.errors.map(error => new Problem(error))
    }
  }

  private mapSimpleProblem(expectedType: string, data: Data): Optional<Problem[]> {
    const actualType = typeof data
    if (actualType !== expectedType)
      return [new Problem({ data, message: shouldBe('type', expectedType, actualType) })]
  }
}
