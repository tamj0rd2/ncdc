import { Ajv } from 'ajv'
import SchemaGenerator from './schema-loader'
import { MapToProblem } from '../messages'
import { Data, DetailedProblem } from '../types'

export default class TypeValidator {
  constructor(
    private readonly validator: Ajv,
    private readonly schemaGenerator: SchemaGenerator,
    private readonly mapToProblem: MapToProblem,
  ) {}

  public getProblems(data: Data, expectedType: string): Optional<DetailedProblem[]> {
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

        if (isValid || !validator.errors) return []
        return validator.errors.map(
          (error): DetailedProblem => ({
            dataPath: error.dataPath,
            data: error.data,
            message: error.message,
            parentSchema: error.parentSchema,
          }),
        )
    }
  }

  private mapSimpleProblem(expectedType: string, data: Data): Optional<DetailedProblem[]> {
    const actualType = typeof data
    if (actualType !== expectedType) return [this.mapToProblem('type', expectedType, actualType, data)]
  }
}
