import mainYargs from 'yargs'
import { createServeCommand, createTestCommand } from './commands'
import { opts } from './commands'
import Metrics from '~metrics'
import createNcdcLogger from '~logger'
import { GetRootDeps } from '~commands/shared'

export default function run(): void {
  const getCommonDeps: GetRootDeps = (verbose) => {
    const logger = createNcdcLogger(verbose)
    const metrics = new Metrics(logger)
    const { success, fail } = metrics.reportMetric('Program')

    process.on('exit', (code) => {
      code === 0 ? success() : fail()
    })

    return {
      logger,
      reportMetric: metrics.reportMetric.bind(metrics),
      handleError: ({ message }) => {
        logger.error(message)
        process.exit(1)
      },
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  mainYargs
    .command(createServeCommand(getCommonDeps))
    .command(createTestCommand(getCommonDeps))
    .example(opts.EXAMPLE_SERVE_COMMAND, opts.EXAMPLE_SERVE_DESCRIPTION)
    .example(opts.EXAMPLE_TEST_COMMAND, opts.EXAMPLE_TEST_DESCRIPTION)
    .demandCommand()
    .strict()
    .help().argv
}
