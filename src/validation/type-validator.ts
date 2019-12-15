import { Ajv } from 'ajv'
import SchemaGenerator from './schema-loader'
import { Data } from '../types'
import Problem, { ProblemType } from '../problem'
import { shouldBe } from '../messages'

export default class TypeValidator {
  constructor(private readonly validator: Ajv, private readonly schemaGenerator: SchemaGenerator) {}

  public async getProblems(
    data: Optional<Data>,
    expectedType: string,
    type: ProblemType,
  ): Promise<Optional<Problem[]>> {
    switch (expectedType) {
      case 'string':
        return this.mapSimpleProblem('string', data, type)
      case 'number':
        return this.mapSimpleProblem('number', data, type)
      case 'boolean':
        return this.mapSimpleProblem('boolean', data, type)
      case 'object':
        return this.mapSimpleProblem('object', data, type)
      default:
        const jsonSchema = this.schemaGenerator.load(expectedType)
        const validator = this.validator.compile(jsonSchema)
        const isValid = validator(data)

        if (isValid || !validator.errors) return
        return validator.errors.map(error => new Problem(error, type))
    }
  }

  private mapSimpleProblem(
    expectedType: string,
    data: Optional<Data>,
    type: ProblemType,
  ): Optional<Problem[]> {
    const actualType = typeof data
    if (actualType !== expectedType)
      return [new Problem({ data, message: shouldBe('type', expectedType, actualType) }, type)]
  }
}
