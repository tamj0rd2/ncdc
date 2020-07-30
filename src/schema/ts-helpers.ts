import { ReportMetric } from '~commands/shared'
import { NcdcLogger } from '~logger'
import ts from 'typescript'
import { dirname, resolve } from 'path'

export default class TsHelpers {
  private readonly compilationErrorMessage =
    'Your typescript project has compilation errors. Run tsc to debug.'

  constructor(private readonly reportMetric: ReportMetric, private readonly logger: NcdcLogger) {}

  public createProgram(tsconfigPath: string, shouldTypecheck: boolean): ts.Program {
    const config = this.readTsConfig(tsconfigPath)
    if (config.options.composite) this.buildSolution(tsconfigPath)
    const program = this.buildProgram(config)

    // composite programs already get type checked during the solution build
    if (shouldTypecheck && !config.options.composite) this.typecheck(program)
    return program
  }

  public typecheck(program: ts.Program): void {
    const { success, fail } = this.reportMetric('typecheck')
    const diagnostics = ts.getPreEmitDiagnostics(program)

    if (diagnostics.length) {
      fail()
      diagnostics.forEach((d) => this.logger.verbose(this.formatErrorDiagnostic(d)))
      throw new Error(this.compilationErrorMessage)
    }

    success()
  }

  public formatErrorDiagnostic = (diagnostic: ts.Diagnostic): string => {
    return `Error ${diagnostic.code}: ${ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      ts.sys.newLine,
    )}`
  }

  public readTsConfig(path: string): ts.ParsedCommandLine {
    const tsconfigPath = resolve(path)
    const rawConfigFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
    if (rawConfigFile.error) throw new Error(this.formatErrorDiagnostic(rawConfigFile.error))
    if (!rawConfigFile.config) throw new Error('Could not parse your tsconfig file')

    const configFile = ts.parseJsonConfigFileContent(
      rawConfigFile.config,
      ts.sys,
      dirname(tsconfigPath),
      {},
      tsconfigPath,
    )
    if (configFile.errors.length) {
      throw new Error(configFile.errors.map(this.formatErrorDiagnostic).join('\n'))
    }

    const shouldEmit = !!configFile.options.incremental || !!configFile.options.composite
    const fallbackTsbuild = configFile.options.outDir && `${configFile.options.outDir}/tsconfig.tsbuildinfo`

    configFile.options.incremental = shouldEmit
    configFile.options.tsBuildInfoFile = configFile.options.tsBuildInfoFile || fallbackTsbuild
    configFile.options.noEmit = shouldEmit ? undefined : true
    return configFile
  }

  private buildSolution(tsconfigPath: string): void {
    const { success, fail } = this.reportMetric('build typescript solution')
    const solutionBuilderHost = ts.createSolutionBuilderHost(ts.sys, undefined, (dianostic) =>
      this.logger.verbose(this.formatErrorDiagnostic(dianostic)),
    )
    const solutionBuilder = ts.createSolutionBuilder(solutionBuilderHost, [tsconfigPath], {})
    const exitCode = solutionBuilder.build()

    if (exitCode !== ts.ExitStatus.Success) {
      fail()
      throw new Error(this.compilationErrorMessage)
    }

    success()
  }

  private buildProgram(config: ts.ParsedCommandLine): ts.Program {
    const { success, fail } = this.reportMetric('build typescript program')

    const programArgs = {
      options: config.options,
      rootNames: config.fileNames,
      projectReferences: config.projectReferences,
      configFileParsingDiagnostics: ts.getConfigFileParsingDiagnostics(config),
    }

    try {
      const program = config.options.incremental
        ? ts.createIncrementalProgram(programArgs).getProgram()
        : ts.createProgram(programArgs)
      success()
      return program
    } catch (err) {
      fail()
      this.logger.verbose(err.message)
      throw new Error(this.compilationErrorMessage)
    }
  }
}
