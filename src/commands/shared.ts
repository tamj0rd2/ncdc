import createNcdcLogger, { NcdcLogger } from '~logger'
import MetricsReporter, { OperationResult } from '~metrics'
import { CommandModule as YargsCommandModule, Argv } from 'yargs'

export type ReportMetric = (operation: string) => OperationResult

interface CommonArgs {
  tsconfigPath: string
  schemaPath?: string
  verbose: boolean
  force: boolean
}

interface CommonDeps {
  logger: NcdcLogger
  reportMetric: ReportMetric
}

export const createCommand = <Args>(opts: {
  command: string
  describe: string
  builder(yargs: Argv<CommonArgs>): Argv<Args & CommonArgs>
  handler(args: Args & CommonArgs, deps: CommonDeps): void | Promise<void>
}): YargsCommandModule<CommonArgs, Args & CommonArgs> => {
  return {
    command: opts.command,
    describe: opts.describe,
    builder: opts.builder,
    handler: async (args) => {
      const logger = createNcdcLogger(args.verbose)
      const metrics = new MetricsReporter(logger)
      const reportMetric = metrics.report.bind(metrics)
      const { success, fail } = reportMetric('Program')

      process.on('exit', (code) => {
        code === 0 ? success() : fail()
      })

      try {
        await opts.handler(args, { logger, reportMetric })
      } catch (err) {
        logger.error(err.message)
        process.exit(1)
      }
    },
  }
}
