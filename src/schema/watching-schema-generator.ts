import { SchemaGenerator } from './schema-generator'
import { resolve } from 'path'
import { SchemaRetriever } from './types'
import ts from 'typescript'
import { Definition } from 'typescript-json-schema'
import { formatErrorDiagnostic, readTsConfig } from './ts-helpers'
import { NcdcLogger } from '~logger'
import { ReportMetric } from '~commands/shared'

export type CompilerHook = () => Promise<void> | void

// TODO: oh god this hook business is needlessly complicated
export class WatchingSchemaGenerator implements SchemaRetriever {
  private initiated = false
  private isFirstCompilationRun = true
  private isFirstStatusReport = true
  private programHasErrors = false

  private tsconfigPath: string
  private schemaRetriever?: SchemaGenerator

  private readonly COMPILED_DIAGNOSTIC_CODE = 6194

  public constructor(
    tsconfigPath: string,
    private readonly logger: NcdcLogger,
    private readonly reportMetric: ReportMetric,
    private readonly onReload?: CompilerHook,
    private readonly onCompilationFailure?: CompilerHook,
  ) {
    this.tsconfigPath = resolve(tsconfigPath)
  }

  public init(): void {
    if (this.initiated) return
    const { success } = this.reportMetric('Initiating typescript watcher')
    this.initiated = true

    const configFile = readTsConfig(this.tsconfigPath)
    const watcherHost = ts.createWatchCompilerHost(
      this.tsconfigPath,
      { noEmit: configFile.options.noEmit },
      ts.sys,
      ts.createEmitAndSemanticDiagnosticsBuilderProgram,
      this.reportDiagnostic,
      this.reportWatchStatus,
    )

    const origAfterProgramCreate = watcherHost.afterProgramCreate
    watcherHost.afterProgramCreate = (watcherProgram) => {
      const isFirstFullRun = this.isFirstCompilationRun
      origAfterProgramCreate?.(watcherProgram)

      if (this.programHasErrors) return this.onCompilationFailure?.()

      success()
      this.schemaRetriever = new SchemaGenerator(watcherProgram.getProgram(), false, this.reportMetric)
      this.schemaRetriever.init?.()
      if (!isFirstFullRun) return this.onReload?.()
    }

    ts.createWatchProgram(watcherHost)
  }

  public load(symbolName: string): Promise<Definition> {
    if (!this.initiated) throw new Error('Watching has not started yet')
    if (!this.schemaRetriever) throw new Error('No schema generator... somehow')
    return this.schemaRetriever.load(symbolName)
  }

  private reportDiagnostic: ts.DiagnosticReporter = (diagnostic) =>
    this.logger.error(formatErrorDiagnostic(diagnostic))

  private reportWatchStatus: ts.WatchStatusReporter = (diagnostic, _1, _2, errorCount): void => {
    this.programHasErrors = false

    if (!this.isFirstCompilationRun && diagnostic.code !== this.COMPILED_DIAGNOSTIC_CODE) {
      this.logger.info('Detected a change to your source files')
    }

    if (errorCount) this.programHasErrors = true

    if (this.isFirstCompilationRun) {
      if (this.isFirstStatusReport) {
        this.logger.info('Watching your source types for changes...')
        this.isFirstStatusReport = false
      }
      if (diagnostic.code === this.COMPILED_DIAGNOSTIC_CODE) {
        this.isFirstCompilationRun = false
      }
      return
    }
  }
}
