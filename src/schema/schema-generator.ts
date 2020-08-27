import { SchemaRetriever } from './types'
import type { Program } from 'typescript'
import {
  SchemaGenerator as TsSchemaGenerator,
  createParser,
  createFormatter,
  Config,
  NoRootTypeError,
} from 'ts-json-schema-generator'
import { JSONSchema7 } from 'json-schema'

type JsonSchemaGenerator = (type: string) => JSONSchema7

export class SchemaGenerator implements SchemaRetriever {
  private readonly cache = new Map<string, JSONSchema7>()
  private generateJsonSchema?: JsonSchemaGenerator

  constructor(private readonly program: Program) {}

  public init(): void {
    this.generateJsonSchema = this.createGenerator(this.program)
  }

  public load = async (symbolName: string): Promise<JSONSchema7> => {
    const cachedSchema = this.cache.get(symbolName)
    if (cachedSchema) {
      return cachedSchema
    }

    if (!this.generateJsonSchema) {
      throw new Error('This SchemaGenerator instance has not been initialised')
    }

    try {
      const schema = this.generateJsonSchema(symbolName)
      this.cache.set(symbolName, schema)
      return Promise.resolve(schema)
    } catch (err) {
      if (err instanceof NoRootTypeError) {
        throw new Error(`Could not find type: ${symbolName}`)
      }

      throw new Error(`Could not create a schema for type: ${symbolName}\n${err.message}`)
    }
  }

  private createGenerator(program: Program): JsonSchemaGenerator {
    const config: Config = { skipTypeCheck: true, expose: 'all', additionalProperties: true }
    const generator = new TsSchemaGenerator(
      program,
      createParser(program, config),
      createFormatter(config),
      config,
    )

    return generator.createSchema.bind(generator)
  }
}
