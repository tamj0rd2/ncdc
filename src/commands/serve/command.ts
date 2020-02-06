import { Argv } from 'yargs'
import yargs from 'yargs'
import { resolve } from 'path'
import readConfig, { Config } from '~config'
import { HandleError, CreateTypeValidator } from '../shared'
import { startServer } from './server'
import { Mode } from '~config/types'
import logger from '~logger'
import * as consts from '~commands/consts'

interface ServeArgs {
  configPath?: string
  port: number
  tsconfigPath: string
  schemaPath?: string
  force: boolean
}

const builder = (yargs: Argv): Argv<ServeArgs> =>
  yargs
    .positional(consts.CONFIG_PATH, {
      describe: consts.CONFIG_PATH_DESCRIBE,
      type: consts.CONFIG_PATH_TYPE,
    })
    .positional('port', {
      describe: 'port to serve the API on',
      type: 'number',
      default: 4000,
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
    .example(consts.EXAMPLE_SERVE_COMMAND, consts.EXAMPLE_SERVE_DESCRIPTION)

const createHandler = (handleError: HandleError, createTypeValidator: CreateTypeValidator) => async (
  args: ServeArgs,
): Promise<void> => {
  const { configPath, port, tsconfigPath, schemaPath, force } = args
  if (!configPath) process.exit(1)

  if (isNaN(port)) {
    yargs.showHelp()
    logger.error('\nport must be a number')
    return process.exit(1)
  }

  const typeValidator = createTypeValidator(tsconfigPath, force, schemaPath)
  const fullConfigPath = resolve(configPath)

  let configs: Config[]
  try {
    configs = await readConfig(fullConfigPath, typeValidator, Mode.Serve)
  } catch (err) {
    return handleError(err)
  }

  if (!configs.length) {
    logger.info('No mocks to run')
    return
  }

  return startServer(port, configs, typeValidator)
    .then(() => process.exit())
    .catch(handleError)
}

export default function createServeCommand(
  handleError: HandleError,
  createTypeValidator: CreateTypeValidator,
): yargs.CommandModule<{}, ServeArgs> {
  return {
    command: 'serve <configPath> [port]',
    describe: 'Serves configured endpoints',
    builder,
    handler: createHandler(handleError, createTypeValidator),
  }
}
