import { HandleError, CreateTypeValidator } from '../shared'
import { Argv, CommandModule } from 'yargs'
import { createHttpClient } from './http-client'
import axios from 'axios'
import readConfig, { Config } from '~config'
import { testConfigs } from './test'
import { Mode } from '~config/types'
import logger from '~logger'
import * as consts from '~commands/consts'

interface TestArgs {
  schemaPath?: string
  tsconfigPath: string
  configPath?: string
  baseURL?: string
}

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
    .example(consts.EXAMPLE_TEST_COMMAND, consts.EXAMPLE_TEST_DESCRIPTION)

const createHandler = (handleError: HandleError, createTypeValidator: CreateTypeValidator) => async (
  args: TestArgs,
): Promise<void> => {
  const { configPath, baseURL, tsconfigPath, schemaPath } = args
  if (!configPath || !baseURL) process.exit(1)

  const typeValidator = createTypeValidator(tsconfigPath, schemaPath)

  let configs: Config[]
  try {
    configs = await readConfig(configPath, typeValidator, Mode.Test)
  } catch (err) {
    return handleError(err)
  }

  if (!configs.length) {
    logger.info('No tests to run')
    return
  }

  testConfigs(baseURL, createHttpClient(axios.create({ baseURL })), configs, typeValidator)
    .then(() => process.exit())
    .catch(handleError)
}

export default function createTestCommand(
  handleError: HandleError,
  createTypeValidator: CreateTypeValidator,
): CommandModule<{}, TestArgs> {
  return {
    command: 'test <configPath> <baseURL>',
    describe: 'Tests configured endpoints',
    builder,
    handler: createHandler(handleError, createTypeValidator),
  }
}
