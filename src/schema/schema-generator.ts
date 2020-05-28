import { SchemaRetriever } from './types'
import ts from 'typescript'
import { JsonSchemaGenerator, buildGenerator, Definition } from 'typescript-json-schema'
import { readTsConfig, formatErrorDiagnostic } from './ts-helpers'
import { logMetric, MetricState } from '~metrics'

export class SchemaGenerator implements SchemaRetriever {
  private readonly cache = new Map<string, Definition>()
  private generator?: JsonSchemaGenerator

  private readonly programMetric = 'build a typescript program'
  private readonly generateMetric = 'build a schema generator'

  constructor(
    private readonly pathOrProgram: string | ts.Program,
    private readonly skipTypeChecking = false,
  ) {}

  public init(): void {
    const program = this.getTsProgram()

    logMetric(this.generateMetric, MetricState.Started)
    const generator = buildGenerator(program, { required: true, ignoreErrors: true })
    if (!generator) {
      logMetric(this.generateMetric, MetricState.Failed)
      throw new Error('Could not build a generator from the given typescript configuration')
    }
    logMetric(this.generateMetric, MetricState.Completed)
    this.generator = generator
  }

  public async load(symbolName: string): Promise<Definition> {
    this.reportLoadMetric(symbolName, MetricState.Started)
    let schema = this.cache.get(symbolName)

    if (!schema) {
      if (!this.generator) {
        this.reportLoadMetric(symbolName, MetricState.Failed)
        throw new Error('No schema generator has been initialised')
      }

      try {
        schema = this.generator.getSchemaForSymbol(symbolName)
      } catch (err) {
        this.reportLoadMetric(symbolName, MetricState.Failed)
        throw err
      }

      this.cache.set(symbolName, schema)
    }

    this.reportLoadMetric(symbolName, MetricState.Completed)
    return Promise.resolve(schema)
  }

  private getTsProgram(): ts.Program {
    if (typeof this.pathOrProgram !== 'string') return this.pathOrProgram
    logMetric(this.programMetric, MetricState.Started)
    const configFile = readTsConfig(this.pathOrProgram)
    const program = ts.createProgram({ rootNames: configFile.fileNames, options: configFile.options })

    if (!this.skipTypeChecking) {
      const diagnostics = ts.getPreEmitDiagnostics(program)
      if (diagnostics.length) {
        logMetric(this.programMetric, MetricState.Failed)
        throw new Error(diagnostics.map(formatErrorDiagnostic).join('\n'))
      }
    }

    logMetric(this.programMetric, MetricState.Completed)
    return program
  }

  private reportLoadMetric = (name: string, state: MetricState): void => {
    logMetric(`load schema for ${name}`, state)
  }
}
