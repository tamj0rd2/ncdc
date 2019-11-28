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

  public getValidationErrors(data: Data, expectedType: string): DetailedProblem[] {
    const actualType = typeof data
    switch (expectedType) {
      case 'string':
        if (actualType !== 'string') return this.mapSimpleProblem('string', data)
        break
      case 'number':
        if (actualType !== 'number') return this.mapSimpleProblem('number', data)
        break
      case 'boolean':
        if (actualType !== 'boolean') return this.mapSimpleProblem('boolean', data)
        break
      case 'object':
        if (actualType !== 'object') return this.mapSimpleProblem('object', data)
        break
    }

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

  private mapSimpleProblem(type: string, data: Data): DetailedProblem[] {
    return [this.mapToProblem('type', type, typeof data, data)]
  }
}
