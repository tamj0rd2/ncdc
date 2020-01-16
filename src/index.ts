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

export default async function run(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleError: HandleError = error => {
    logger.error(error.message, error)
    process.exit(1)
  }

  const createTypeValidator: CreateTypeValidator = (tsconfigPath, schemaPath) =>
    new TypeValidator(
      new ajv({ verbose: true, allErrors: true }),
      schemaPath ? new SchemaLoader(schemaPath) : new SchemaGenerator(tsconfigPath),
    )

  // TODO: figure out how I can remove this
  // eslint-disable-next-line no-unused-expressions
  mainYargs
    .command(createGenerateCommand(handleError))
    .command(createServeCommand(handleError, createTypeValidator))
    .command(createTestCommand(handleError, createTypeValidator))
    .example(consts.EXAMPLE_GENERATE_COMMAND, consts.EXAMPLE_GENERATE_DESCRIPTION)
    .example(consts.EXAMPLE_SERVE_COMMAND, consts.EXAMPLE_SERVE_DESCRIPTION)
    .example(consts.EXAMPLE_TEST_COMMAND, consts.EXAMPLE_TEST_DESCRIPTION)
    .demandCommand()
    .strict()
    .help().argv
}
