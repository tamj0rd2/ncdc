import mainYargs from 'yargs'
import { createGenerateCommand, createServeCommand, createTestCommand } from './commands'
import { opts } from './commands'

export default function run(): void {
  // TODO: figure out how I can remove this
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  mainYargs
    .command(createGenerateCommand())
    .command(createServeCommand())
    .command(createTestCommand())
    .example(opts.EXAMPLE_GENERATE_COMMAND, opts.EXAMPLE_GENERATE_DESCRIPTION)
    .example(opts.EXAMPLE_SERVE_COMMAND, opts.EXAMPLE_SERVE_DESCRIPTION)
    .example(opts.EXAMPLE_TEST_COMMAND, opts.EXAMPLE_TEST_DESCRIPTION)
    .demandCommand()
    .strict()
    .help().argv
}
