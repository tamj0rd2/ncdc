import { SchemaRetriever } from './types'
import ts from 'typescript'
import { buildGenerator } from 'typescript-json-schema'
import { readTsConfig, formatErrorDiagnostic } from './ts-helpers'
import { startOperation } from '~metrics'

type JsonSchemaGenerator = (type: string) => object

export class SchemaGenerator implements SchemaRetriever {
  private readonly cache = new Map<string, object>()
  private generateJsonSchema?: JsonSchemaGenerator

  constructor(
    private readonly pathOrProgram: string | ts.Program,
    private readonly skipTypeChecking = false,
  ) {}

  public init(): void {
    const program = this.getTsProgram()
    this.generateJsonSchema = this.createGenerator(program)
  }

  public async load(symbolName: string): Promise<object> {
    const { success, fail } = startOperation(`load schema for ${symbolName}`)
    let schema = this.cache.get(symbolName)

    if (!schema) {
      if (!this.generateJsonSchema) {
        fail()
        throw new Error('This SchemaGenerator instance has not been initialised')
      }

      try {
        schema = this.generateJsonSchema(symbolName)
      } catch (err) {
        fail()
        throw err
      }

      this.cache.set(symbolName, schema)
    }

    success()
    return Promise.resolve(schema)
  }

  private getTsProgram(): ts.Program {
    if (typeof this.pathOrProgram !== 'string') return this.pathOrProgram
    const { success, fail } = startOperation('build a typescript program')
    const configFile = readTsConfig(this.pathOrProgram)
    const program = ts.createProgram({ rootNames: configFile.fileNames, options: configFile.options })

    if (!this.skipTypeChecking) {
      const diagnostics = ts.getPreEmitDiagnostics(program)
      if (diagnostics.length) {
        fail()
        throw new Error(diagnostics.map(formatErrorDiagnostic).join('\n'))
      }
    }

    success()
    return program
  }

  private createGenerator(program: ts.Program): JsonSchemaGenerator {
    const { success, fail } = startOperation('build a schema generator')

    const generator = buildGenerator(program, { required: true, ignoreErrors: true })
    if (generator) {
      success()
      return generator.getSchemaForSymbol.bind(generator)
    }

    fail()
    throw new Error(
      'Could not get types from your typescript project. Your typescript project likely has compilation errors.',
    )
  }
}
