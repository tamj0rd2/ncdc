import { SchemaGenerator } from './schema-generator'
import { resolve } from 'path'
import { SchemaRetriever } from './types'
import ts from 'typescript'
import logger from '~logger'
import { Definition } from 'typescript-json-schema'
import { formatErrorDiagnostic, readTsConfig } from './ts-helpers'
import { startOperation } from '~metrics'

// TODO: oh god this hook business is needlessly complicated
export class WatchingSchemaGenerator implements SchemaRetriever {
  public onReload?: () => Promise<void> | void
  public onCompilationFailure?: () => Promise<void> | void

  private initiated = false
  private isFirstCompilationRun = true
  private isFirstStatusReport = true
  private programHasErrors = false

  private tsconfigPath: string
  private schemaRetriever?: SchemaRetriever

  private readonly COMPILED_DIAGNOSTIC_CODE = 6194

  public constructor(tsconfigPath: string) {
    this.tsconfigPath = resolve(tsconfigPath)
  }

  public init(): void {
    if (this.initiated) return
    const { success } = startOperation('Initiating typescript watcher')
    this.initiated = true

    const configFile = readTsConfig(this.tsconfigPath)
    const incrementalEnabled = configFile.options.incremental
    const watcherHost = ts.createWatchCompilerHost(
      this.tsconfigPath,
      { noEmit: !incrementalEnabled ?? true },
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
      this.schemaRetriever = new SchemaGenerator(watcherProgram.getProgram())
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
    logger.error(formatErrorDiagnostic(diagnostic))

  private reportWatchStatus: ts.WatchStatusReporter = (diagnostic, _1, _2, errorCount): void => {
    this.programHasErrors = false

    if (!this.isFirstCompilationRun && diagnostic.code !== this.COMPILED_DIAGNOSTIC_CODE) {
      logger.info('Detected a change to your source files')
    }

    if (errorCount) this.programHasErrors = true

    if (this.isFirstCompilationRun) {
      if (this.isFirstStatusReport) {
        logger.info('Watching your source types for changes...')
        this.isFirstStatusReport = false
      }
      if (diagnostic.code === this.COMPILED_DIAGNOSTIC_CODE) {
        this.isFirstCompilationRun = false
      }
      return
    }
  }
}
