import * as TJS from 'typescript-json-schema'
import { resolve } from 'path'
import { SchemaRetriever } from '../types'

export default class SchemaGenerator implements SchemaRetriever {
  private readonly generator: TJS.JsonSchemaGenerator
  private readonly cache: { [symbol: string]: TJS.Definition } = {}

  constructor(tsconfigPath: string) {
    const program = TJS.programFromConfig(resolve(tsconfigPath))
    const generator = TJS.buildGenerator(program, { required: true })
    if (!generator) {
      throw new Error('Could not build a generator from the given typescript configuration')
    }
    this.generator = generator
  }

  public load(symbolName: string): Promise<TJS.Definition> {
    return Promise.resolve(
      this.cache[symbolName] ?? (this.cache[symbolName] = this.generator.getSchemaForSymbol(symbolName)),
    )
  }
}
