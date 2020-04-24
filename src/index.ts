import mainYargs from 'yargs'
import {
  HandleError,
  CreateTypeValidator,
  createGenerateCommand,
  createServeCommand,
  createTestCommand,
} from './commands'
import TypeValidator from './validation/type-validator'
import ajv from 'ajv'
import { SchemaGenerator, SchemaLoader } from './schema'
import logger from '~logger'
import * as consts from './commands/consts'
import inspector from 'inspector'

export default async function run(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleError: HandleError = (error) => {
    logger.error(error.message, error)
    process.exit(1)
  }

  const isDevMode = !!inspector.url()

  // TODO: this should be created lazily so that it isn't created until a type
  // is actually found in the config flie. It's possible some people will not
  // define types at all. And in that case, this is a complete waste of time
  const createTypeValidator: CreateTypeValidator = (tsconfigPath, force, schemaPath) =>
    new TypeValidator(
      new ajv({ verbose: true, allErrors: true }),
      schemaPath ? new SchemaLoader(schemaPath) : new SchemaGenerator(tsconfigPath, force || isDevMode),
    )

  // TODO: figure out how I can remove this
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  mainYargs
    .command(createGenerateCommand(handleError, isDevMode))
    .command(createServeCommand(createTypeValidator))
    .command(createTestCommand(handleError, createTypeValidator))
    .example(consts.EXAMPLE_GENERATE_COMMAND, consts.EXAMPLE_GENERATE_DESCRIPTION)
    .example(consts.EXAMPLE_SERVE_COMMAND, consts.EXAMPLE_SERVE_DESCRIPTION)
    .example(consts.EXAMPLE_TEST_COMMAND, consts.EXAMPLE_TEST_DESCRIPTION)
    .demandCommand()
    .strict()
    .help().argv
}
