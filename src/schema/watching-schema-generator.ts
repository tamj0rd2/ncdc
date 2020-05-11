import { SchemaGenerator } from './schema-generator'
import { resolve } from 'path'
import { SchemaRetriever } from './types'
import ts from 'typescript'
import { existsSync } from 'fs'
import logger from '~logger'
import { Definition } from 'typescript-json-schema'

export class WatchingSchemaGenerator implements SchemaRetriever {
  public onReload?: () => Promise<void> | void
  public onCompilationFailure?: () => Promise<void> | void

  private initiated = false
  private isFirstCompilationRun = true
  private isFirstStatusReport = true
  private programHasErrors = false

  private tsconfigPath: string
  private formatHost: ts.FormatDiagnosticsHost
  private schemaRetriever?: SchemaRetriever

  private readonly COMPILED_DIAGNOSTIC_CODE = 6194

  public constructor(tsconfigPath: string) {
    this.tsconfigPath = resolve(tsconfigPath)
    this.formatHost = {
      getCanonicalFileName: (path) => path,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    }
  }

  public startWatching(): void {
    if (this.initiated) return
    this.initiated = true

    if (!existsSync(this.tsconfigPath)) throw new Error(`${this.tsconfigPath} does not exist`)

    const reportDiagnostic: ts.DiagnosticReporter = (diagnostic) => {
      logger.debug(
        `Error ${diagnostic.code}: ${ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          this.formatHost.getNewLine(),
        )}`,
      )
    }

    const reportWatchStatus: ts.WatchStatusReporter = (diagnostic, _1, _2, errorCount): void => {
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

    const watcherHost = ts.createWatchCompilerHost(
      this.tsconfigPath,
      { noEmit: true },
      ts.sys,
      ts.createEmitAndSemanticDiagnosticsBuilderProgram,
      reportDiagnostic,
      reportWatchStatus,
    )

    const origAfterProgramCreate = watcherHost.afterProgramCreate
    watcherHost.afterProgramCreate = (watcherProgram) => {
      const isFirstFullRun = this.isFirstCompilationRun
      origAfterProgramCreate?.(watcherProgram)

      if (this.programHasErrors) return this.onCompilationFailure?.()
      this.schemaRetriever = new SchemaGenerator(watcherProgram.getProgram())
      if (!isFirstFullRun) return this.onReload?.()
    }

    ts.createWatchProgram(watcherHost)
  }

  public load(symbolName: string): Promise<Definition> {
    if (!this.initiated) throw new Error('Watching has not started yet')
    if (!this.schemaRetriever) throw new Error('No schema generator... somehow')
    return this.schemaRetriever.load(symbolName)
  }
}
