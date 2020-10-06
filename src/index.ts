import mainYargs from 'yargs'
import { generateCommand, serveCommand, testCommand } from './commands'
import { opts } from './commands'

export default function run(): void {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  mainYargs
    .option(opts.TSCONFIG_PATH, opts.TSCONFIG_PATH_OPTS)
    .option(opts.SCHEMA_PATH, opts.SCHEMA_PATH_OPTS)
    .option(opts.FORCE_GENERATION, opts.FORCE_GENERATION_OPTS)
    .option(opts.VERBOSE, opts.VERBOSE_OPTS)
    .command(generateCommand)
    .command(serveCommand)
    .command(testCommand)
    .example(opts.EXAMPLE_GENERATE_COMMAND, opts.EXAMPLE_GENERATE_DESCRIPTION)
    .example(opts.EXAMPLE_SERVE_COMMAND, opts.EXAMPLE_SERVE_DESCRIPTION)
    .example(opts.EXAMPLE_TEST_COMMAND, opts.EXAMPLE_TEST_DESCRIPTION)
    .demandCommand()
    .strict()
    .help().argv
}
