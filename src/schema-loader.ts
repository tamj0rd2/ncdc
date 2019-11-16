import * as TJS from 'typescript-json-schema'

export default class SchemaLoader {
  private readonly generator: TJS.JsonSchemaGenerator
  private readonly cache: { [symbol: string]: TJS.Definition } = {}

  constructor(tsconfigPath: string) {
    const program = TJS.programFromConfig(tsconfigPath)
    const generator = TJS.buildGenerator(program)
    if (!generator) throw new Error('Could not build a generator')
    this.generator = generator
  }

  public load(symbolName: string): TJS.Definition {
    return (
      this.cache[symbolName] ??
      (this.cache[symbolName] = this.generator.getSchemaForSymbol(symbolName))
    )
  }
}
