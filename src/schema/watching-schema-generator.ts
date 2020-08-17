import { SchemaGenerator } from './schema-generator'
import { resolve } from 'path'
import { SchemaRetriever } from './types'
import ts from 'typescript'
import type { Definition } from 'ts-json-schema-generator'
import { NcdcLogger } from '~logger'
import { ReportMetric } from '~commands/shared'
import TsHelpers from './ts-helpers'

export type CompilerHook = () => Promise<void> | void

export class WatchingSchemaGenerator implements SchemaRetriever {
  private readonly state = {
    isInitiated: false,
    hasCompiledSuccessfullyAtLeastOnce: false,
  }

  private tsconfigPath: string
  private schemaGenerator?: SchemaGenerator

  private readonly STARTING_WATCH_CODE = 6031
  private readonly CHANGE_DETECTED_CODE = 6032

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

  public init = (): Promise<void> => {
    if (this.state.isInitiated) return Promise.resolve()

    this.state.isInitiated = true
    const initMetric = this.reportMetric('Initiating watching schema generator')

    const solutionWatcherHost = ts.createSolutionBuilderWithWatchHost(
      ts.sys,
      undefined,
      this.reportDiagnostic,
      undefined,
      this.reportWatchStatus,
    )

    const solution = ts.createSolutionBuilderWithWatch(solutionWatcherHost, [this.tsconfigPath], {
      incremental: true,
    })

    return new Promise((resolve, reject) => {
      const origAfterProgramEmitAndDiagnostics = solutionWatcherHost.afterProgramEmitAndDiagnostics
      solutionWatcherHost.afterProgramEmitAndDiagnostics = (watcherProgram) => {
        origAfterProgramEmitAndDiagnostics?.(watcherProgram)

        const getDianosticsMetric = this.reportMetric('getting diagnostics')
        const diagnostics = [
          ...watcherProgram.getConfigFileParsingDiagnostics(),
          ...watcherProgram.getSyntacticDiagnostics(),
          ...watcherProgram.getOptionsDiagnostics(),
          ...watcherProgram.getGlobalDiagnostics(),
          ...watcherProgram.getSemanticDiagnostics(),
        ]
        getDianosticsMetric.success()

        const wasCompilationSuccessful =
          diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error).length === 0

        if (!this.state.hasCompiledSuccessfullyAtLeastOnce) {
          if (solution.getNextInvalidatedProject()) return
          this.state.hasCompiledSuccessfullyAtLeastOnce = true
          this.setInternalSchemaGenerator(watcherProgram.getProgram())
          initMetric.success()
          return
        }

        if (wasCompilationSuccessful) {
          this.setInternalSchemaGenerator(watcherProgram.getProgram())
          return this.onReload?.()
        } else {
          return this.onCompilationFailure?.()
        }
      }

      // the above function does not get executed unless there are invalidated projects,
      // so instead we build a temporary program using a different strategy
      const shouldBuildTemporaryProgram = !solution.getNextInvalidatedProject()
      if (shouldBuildTemporaryProgram) {
        this.logger.verbose('no invalidated projects - going to build a temporary program')
        try {
          const tempProgram = this.tsHelpers.createProgram(this.tsconfigPath, true)
          this.setInternalSchemaGenerator(tempProgram)
          this.state.hasCompiledSuccessfullyAtLeastOnce = true
        } catch (err) {
          initMetric.fail()
          return reject(err)
        }
      }

      // this is what watches the solution and kicks of the initial build (if there are invalidated projects)
      const solutionBuildResult = solution.build(this.tsconfigPath)
      if (solutionBuildResult !== ts.ExitStatus.Success) {
        initMetric.fail()
        return reject(new Error('Could not compile your typescript source files'))
      }

      resolve()
    })
  }

  public load = async (symbolName: string): Promise<Definition> => {
    if (!this.state.isInitiated) throw new Error('Watcher has not been initiated yet')
    if (!this.schemaGenerator) throw new Error('No schema generator... somehow')
    return this.schemaGenerator.load(symbolName)
  }

  private reportDiagnostic: ts.DiagnosticReporter = (diagnostic) => {
    this.logger.verbose(this.tsHelpers.formatErrorDiagnostic(diagnostic))
  }

  private reportWatchStatus: ts.WatchStatusReporter = (diagnostic): void => {
    switch (diagnostic.code) {
      case this.STARTING_WATCH_CODE:
        this.logger.info('Watching your source files for changes')
        return
      case this.CHANGE_DETECTED_CODE:
        this.logger.info('Detected a change to your source files')
        return
    }
  }

  private setInternalSchemaGenerator(program: ts.Program): void {
    this.schemaGenerator = new SchemaGenerator(program, false, this.reportMetric, this.logger)
    this.schemaGenerator.init?.()
  }
}
