import * as TJS from 'typescript-json-schema'
import { resolve } from 'path'

export default class SchemaGenerator {
  private readonly generator: TJS.JsonSchemaGenerator
  private readonly cache: { [symbol: string]: TJS.Definition } = {}

  constructor(tsconfigPath: string) {
    const program = TJS.programFromConfig(resolve(tsconfigPath))
    const generator = TJS.buildGenerator(program, { required: true })
    if (!generator) {
      console.error('Could not build a generator from the given typescript configuration')
      process.exit(1)
    }
    this.generator = generator
  }

  public load(symbolName: string): TJS.Definition {
    return this.cache[symbolName] ?? (this.cache[symbolName] = this.generator.getSchemaForSymbol(symbolName))
  }
}
