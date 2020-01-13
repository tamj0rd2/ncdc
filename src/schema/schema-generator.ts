import { JsonSchemaGenerator, programFromConfig, buildGenerator, Definition } from 'typescript-json-schema'
import { resolve } from 'path'
import { SchemaRetriever } from './types'

export default class SchemaGenerator implements SchemaRetriever {
  private readonly generator: JsonSchemaGenerator
  private readonly cache: { [symbol: string]: Definition } = {}

  constructor(tsconfigPath: string) {
    const program = programFromConfig(resolve(tsconfigPath))
    const generator = buildGenerator(program, { required: true })
    if (!generator) {
      throw new Error('Could not build a generator from the given typescript configuration')
    }
    this.generator = generator
  }

  public load(symbolName: string): Promise<Definition> {
    return Promise.resolve(
      this.cache[symbolName] ?? (this.cache[symbolName] = this.generator.getSchemaForSymbol(symbolName)),
    )
  }
}
