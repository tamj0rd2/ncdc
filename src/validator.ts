import { Ajv } from 'ajv'
import SchemaGenerator from './schema-loader'
import * as chalk from 'chalk'

export default class TypeValidator {
  constructor(private readonly compiler: Ajv, private readonly schemaGenerator: SchemaGenerator) {}

  public validate(data: any, expectedType: string): Optional<string | object[]> {
    const actualType = typeof data
    switch (expectedType) {
      case 'string':
        if (actualType !== 'string')
          return `Expected type to be ${chalk.green('string')} but received ${actualType}`
        break
      case 'number':
        if (actualType !== 'number')
          return `Expected type to be ${chalk.green('number')} but received ${actualType}`
        break
      case 'boolean':
        if (actualType !== 'boolean')
          return `Expected type to be ${chalk.green('boolean')} but received ${actualType}`
        break
      case 'object':
        if (actualType !== 'object')
          return `Expected type to be ${chalk.green('object')} but received ${actualType}`
        break
      default: {
        const jsonSchema = this.schemaGenerator.load(expectedType)
        const validator = this.compiler.compile(jsonSchema)
        const isValid = validator(data)

        if (isValid || !validator.errors) return
        return validator.errors.map(({ dataPath, schema, data }) => ({
          'Data path': dataPath,
          'Expected type': schema,
          'Actual type': actualType,
          Data: data,
        }))
      }
    }
  }
}
