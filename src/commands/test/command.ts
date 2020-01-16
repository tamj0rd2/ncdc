import { HandleError, CreateTypeValidator } from '../shared'
import { Argv, CommandModule } from 'yargs'
import { createHttpClient } from './http-client'
import axios from 'axios'
import readConfig, { Config } from '~config'
import { testConfigs } from './test'
import { Mode } from '~config/types'
import logger from '~logger'

interface TestArgs {
  allErrors: boolean
  schemaPath?: string
  tsconfigPath: string
  configPath?: string
  baseURL?: string
}

const builder = (yargs: Argv): Argv<TestArgs> =>
  yargs
    .option('allErrors', {
      alias: 'a',
      type: 'boolean',
      description: 'show all validation errors per test instead of failing fast',
      default: false,
    })
    .option('schemaPath', {
      type: 'string',
      description: 'specify a path to load json schemas from, rather than generating them',
    })
    .option('tsconfigPath', {
      alias: 'c',
      type: 'string',
      description: 'a path to the tsconfig which contains required symbols',
      default: './tsconfig.json',
    })
    .positional('configPath', {
      describe: 'path to the mock config',
      type: 'string',
    })
    .positional('baseURL', {
      describe: 'the URL that your endpoints should be accessed through',
      type: 'string',
    })

const createHandler = (handleError: HandleError, createTypeValidator: CreateTypeValidator) => async (
  args: TestArgs,
): Promise<void> => {
  const { configPath, baseURL, allErrors, tsconfigPath, schemaPath } = args
  if (!configPath || !baseURL) process.exit(1)

  const typeValidator = createTypeValidator(allErrors, tsconfigPath, schemaPath)

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
