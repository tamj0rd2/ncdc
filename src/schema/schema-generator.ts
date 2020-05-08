import { JsonSchemaGenerator, programFromConfig, buildGenerator, Definition } from 'typescript-json-schema'
import { resolve } from 'path'
import { SchemaRetriever } from './types'
import { existsSync } from 'fs'

export default class SchemaGenerator implements SchemaRetriever {
  private readonly generator: JsonSchemaGenerator
  private readonly cache = new Map<string, Definition>()

  // TODO: constructors probably shouldn't have side effects like these
  constructor(tsconfigPath: string, isDevMode: boolean) {
    const fullTsconfigPath = resolve(tsconfigPath)
    if (!existsSync(fullTsconfigPath)) throw new Error(`${fullTsconfigPath} does not exist`)

    const program = programFromConfig(resolve(tsconfigPath))
    const generator = buildGenerator(program, { required: true, ignoreErrors: isDevMode })
    if (!generator) {
      throw new Error('Could not build a generator from the given typescript configuration')
    }
    this.generator = generator
  }

  public load(symbolName: string): Promise<Definition> {
    let schema = this.cache.get(symbolName)

    if (!schema) {
      schema = this.generator.getSchemaForSymbol(symbolName)
      this.cache.set(symbolName, schema)
    }

    return Promise.resolve(schema)
  }
}
