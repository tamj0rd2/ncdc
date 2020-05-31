import mainYargs from 'yargs'
import { createGenerateCommand, createServeCommand, createTestCommand, HandleError } from './commands'
import { opts } from './commands'
import { startOperation } from '~metrics'
import logger from '~logger'

export default function run(): void {
  const { success, fail } = startOperation('Program')

  const handleError: HandleError = ({ message }) => {
    logger.error(message)
    fail()
    process.exit(1)
  }

  // TODO: figure out how I can remove this
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  mainYargs
    .command(createGenerateCommand(handleError))
    .command(createServeCommand(handleError))
    .command(createTestCommand(handleError))
    .example(opts.EXAMPLE_GENERATE_COMMAND, opts.EXAMPLE_GENERATE_DESCRIPTION)
    .example(opts.EXAMPLE_SERVE_COMMAND, opts.EXAMPLE_SERVE_DESCRIPTION)
    .example(opts.EXAMPLE_TEST_COMMAND, opts.EXAMPLE_TEST_DESCRIPTION)
    .demandCommand()
    .onFinishCommand(success)
    .strict()
    .help().argv
}
