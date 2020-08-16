import { SchemaGenerator } from './schema-generator'
import { resolve } from 'path'
import { SchemaRetriever } from './types'
import ts from 'typescript'
import type { Definition } from 'ts-json-schema-generator'
import { NcdcLogger } from '~logger'
import { ReportMetric } from '~commands/shared'
import TsHelpers from './ts-helpers'

export type CompilerHook = () => Promise<void> | void
enum ActionType {
  Initiated = 'initiate',
  CompileSucceeded = 'compile succeeded',
  CompileFailed = 'compile failed',
  AfterProgramCreateFinished = 'afterProgramCreate finished',
}

type Action = { type: ActionType }

export class WatchingSchemaGenerator implements SchemaRetriever {
  private readonly state = {
    initiated: false,
    wasCompilationSuccessful: false,
    hasCompiledSuccessfullyAtLeastOnceBefore: false,
  }

  private tsconfigPath: string
  private schemaGenerator?: SchemaGenerator

  private readonly STARTING_WATCH_CODE = 6031
  private readonly CHANGE_DETECTED_CODE = 6032
  private readonly COMPILE_SUCCESS_CODE = 6194
  private readonly COMPILE_FAILED_CODE = 6193

  public constructor(
    tsconfigPath: string,
    private readonly tsHelpers: TsHelpers,
    private readonly logger: NcdcLogger,
    private readonly reportMetric: ReportMetric,
    private readonly onReload?: CompilerHook,
    private readonly onCompilationFailure?: CompilerHook,
  ) {
    this.tsconfigPath = resolve(tsconfigPath)
  }

  public init(): void {
    if (this.state.initiated) return
    this.dispatchAction({ type: ActionType.Initiated })

    const initiateTypecheckerMetric = this.reportMetric('Initiating typescript watcher')

    const configFile = this.tsHelpers.readTsConfig(this.tsconfigPath)
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
      origAfterProgramCreate?.(watcherProgram)

      if (!this.state.wasCompilationSuccessful) {
        if (this.state.hasCompiledSuccessfullyAtLeastOnceBefore) {
          this.dispatchAction({ type: ActionType.AfterProgramCreateFinished })
          return this.onCompilationFailure?.()
        }

        initiateTypecheckerMetric.fail()
        throw new Error('Could not compile your typescript source files')
      }

      if (!this.state.hasCompiledSuccessfullyAtLeastOnceBefore) {
        initiateTypecheckerMetric.success()
      }

      this.schemaGenerator = new SchemaGenerator(
        watcherProgram.getProgram(),
        false,
        this.reportMetric,
        this.logger,
      )
      this.schemaGenerator.init?.()

      const shouldRestart = this.state.hasCompiledSuccessfullyAtLeastOnceBefore
      this.dispatchAction({ type: ActionType.AfterProgramCreateFinished })
      if (shouldRestart) return this.onReload?.()
    }

    ts.createWatchProgram(watcherHost)
  }

  public load(symbolName: string): Promise<Definition> {
    if (!this.state.initiated) throw new Error('Watching has not started yet')
    if (!this.schemaGenerator) throw new Error('No schema generator... somehow')
    return this.schemaGenerator.load(symbolName)
  }

  private reportDiagnostic: ts.DiagnosticReporter = (diagnostic) => {
    this.logger.verbose(this.tsHelpers.formatErrorDiagnostic(diagnostic))
  }

  private reportWatchStatus: ts.WatchStatusReporter = (diagnostic, _1, _2, errorCount): void => {
    if (errorCount) {
      this.dispatchAction({ type: ActionType.CompileFailed })
      return
    }

    switch (diagnostic.code) {
      case this.STARTING_WATCH_CODE:
        this.logger.info('Watching your source types for changes...')
        return
      case this.CHANGE_DETECTED_CODE:
        this.logger.info('Detected a change to your source types...')
        return
      case this.COMPILE_SUCCESS_CODE:
        this.dispatchAction({ type: ActionType.CompileSucceeded })
        return
      case this.COMPILE_FAILED_CODE:
        this.dispatchAction({ type: ActionType.CompileFailed })
        return
    }
  }

  private dispatchAction(action: Action): void {
    if (action.type === ActionType.Initiated) {
      this.state.initiated = true
      return
    }

    if (action.type === ActionType.CompileSucceeded) {
      this.state.wasCompilationSuccessful = true
      return
    }

    if (action.type === ActionType.CompileFailed) {
      this.state.wasCompilationSuccessful = false
      return
    }

    if (action.type === ActionType.AfterProgramCreateFinished) {
      this.state.wasCompilationSuccessful = false
      this.state.hasCompiledSuccessfullyAtLeastOnceBefore = true
    }
  }
}
