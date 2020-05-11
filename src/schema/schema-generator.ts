import { resolve, dirname } from 'path'
import { SchemaRetriever } from './types'
import ts from 'typescript'
import { JsonSchemaGenerator, buildGenerator, Definition } from 'typescript-json-schema'

export class SchemaGenerator implements SchemaRetriever {
  private readonly cache = new Map<string, Definition>()
  private generator?: JsonSchemaGenerator

  // TODO: constructors probably shouldn't have side effects like these
  constructor(private readonly pathOrProgram: string | ts.Program, private readonly force = false) {}

  public init(): void {
    let program: ts.Program
    if (typeof this.pathOrProgram === 'string') {
      const tsconfigPath = resolve(this.pathOrProgram)
      const rawConfigFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
      if (rawConfigFile.error) throw new Error(this.formatErrorDiagnostic(rawConfigFile.error))
      if (!rawConfigFile.config) throw new Error('Could not parse the given tsconfig file')

      const configFile = ts.parseJsonConfigFileContent(
        rawConfigFile.config,
        ts.sys,
        dirname(tsconfigPath),
        {},
        tsconfigPath,
      )
      configFile.options.noEmit = !configFile.options.incremental ?? true
      program = ts.createProgram({ rootNames: configFile.fileNames, options: configFile.options })
    } else {
      program = this.pathOrProgram
    }

    const generator = buildGenerator(program, { required: true, ignoreErrors: this.force })
    if (!generator) throw new Error('Could not build a generator from the given typescript configuration')
    this.generator = generator
  }

  public async load(symbolName: string): Promise<Definition> {
    let schema = this.cache.get(symbolName)

    if (!schema) {
      if (!this.generator) throw new Error('No schema generator has been initialised')
      schema = this.generator.getSchemaForSymbol(symbolName)
      this.cache.set(symbolName, schema)
    }

    return Promise.resolve(schema)
  }

  private formatErrorDiagnostic(diagnostic: ts.Diagnostic): string {
    return `Error ${diagnostic.code}: ${ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      ts.sys.newLine,
    )}`
  }
}
