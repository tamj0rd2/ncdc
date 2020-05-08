import { HandleError, CreateTypeValidator } from '../shared'
import { Argv, CommandModule } from 'yargs'
import * as consts from '~commands/consts'
import { createHandler, TestArgs } from './handler'
import logger from '~logger'
import { runTests } from './test'
import loadConfig from '~config/load'

const builder = (yargs: Argv): Argv<TestArgs> =>
  yargs
    .positional(consts.CONFIG_PATH, {
      describe: consts.CONFIG_PATH_DESCRIBE,
      type: consts.CONFIG_PATH_TYPE,
    })
    .positional('baseURL', {
      describe: 'the URL that your endpoints should be accessed through',
      type: 'string',
    })
    .option(consts.SCHEMA_PATH, {
      type: consts.SCHEMA_PATH_TYPE,
      description: consts.SCHEMA_PATH_DESCRIPTION,
    })
    .option(consts.TSCONFIG_PATH, {
      alias: consts.TSCONFIG_ALIAS,
      type: consts.TSCONFIG_TYPE,
      description: consts.TSCONFIG_DESCRIPTION,
      default: consts.TSCONFIG_DEFAULT,
    })
    .option(consts.FORCE_GENERATION, {
      alias: consts.FORCE_GENERATION_ALIAS,
      type: consts.FORCE_GENERATION_TYPE,
      default: false,
      description: consts.FORCE_GENERATION_DESCRIPTION,
    })
    .example(consts.EXAMPLE_TEST_COMMAND, consts.EXAMPLE_TEST_DESCRIPTION)

export default function createTestCommand(
  createTypeValidator: CreateTypeValidator,
): CommandModule<{}, TestArgs> {
  const handleError: HandleError = ({ message }) => {
    logger.error(message)
    process.exit(1)
  }

  return {
    command: 'test <configPath> <baseURL>',
    describe: 'Tests configured endpoints',
    builder,
    handler: createHandler(handleError, createTypeValidator, logger, runTests, loadConfig),
  }
}
