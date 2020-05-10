import { resolve } from 'path'
import { SchemaRetriever } from './types'
import { existsSync } from 'fs'
import ts from 'typescript'
import { JsonSchemaGenerator, buildGenerator, Definition, programFromConfig } from 'typescript-json-schema'

export class SchemaGenerator implements SchemaRetriever {
  private readonly generator: JsonSchemaGenerator
  private readonly cache = new Map<string, Definition>()

  // TODO: constructors probably shouldn't have side effects like these
  constructor(pathOrProgram: string | ts.Program, force?: boolean) {
    let program: ts.Program
    if (typeof pathOrProgram === 'string') {
      const fullTsconfigPath = resolve(pathOrProgram)
      if (!existsSync(fullTsconfigPath)) throw new Error(`${fullTsconfigPath} does not exist`)
      program = programFromConfig(fullTsconfigPath)
    } else {
      program = pathOrProgram
    }

    const generator = buildGenerator(program, { required: true, ignoreErrors: force })
    if (!generator) throw new Error('Could not build a generator from the given typescript configuration')
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
