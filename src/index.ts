import mainYargs from 'yargs'
import { createGenerateCommand, createServeCommand, createTestCommand } from './commands'
import * as consts from './commands/consts'

export default function run(): void {
  // TODO: figure out how I can remove this
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  mainYargs
    .command(createGenerateCommand())
    .command(createServeCommand())
    .command(createTestCommand())
    .example(consts.EXAMPLE_GENERATE_COMMAND, consts.EXAMPLE_GENERATE_DESCRIPTION)
    .example(consts.EXAMPLE_SERVE_COMMAND, consts.EXAMPLE_SERVE_DESCRIPTION)
    .example(consts.EXAMPLE_TEST_COMMAND, consts.EXAMPLE_TEST_DESCRIPTION)
    .demandCommand()
    .strict()
    .help().argv
}
