import { Argv } from 'yargs'
import yargs from 'yargs'
import { resolve } from 'path'
import readConfig, { Config } from '~config'
import { HandleError, CreateTypeValidator } from '../shared'
import { startServer } from './server'
import { Mode } from '~config/types'
import logger from '~logger'
import * as consts from '~commands/consts'
import chokidar from 'chokidar'
import { Server } from 'http'

interface ServeArgs {
  configPath?: string
  port: number
  tsconfigPath: string
  schemaPath?: string
  force: boolean
  watch: boolean
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
    .option(consts.WATCH, {
      type: consts.WATCH_TYPE,
      description: consts.WATCH_DESCRIPTION,
      default: consts.WATCH_DEFAULT,
    })
    .example(consts.EXAMPLE_SERVE_COMMAND, consts.EXAMPLE_SERVE_DESCRIPTION)

const createHandler = (handleError: HandleError, createTypeValidator: CreateTypeValidator) => async (
  args: ServeArgs,
): Promise<void> => {
  const { configPath, port, tsconfigPath, schemaPath, force, watch } = args
  if (!configPath) process.exit(1)

  if (isNaN(port)) {
    yargs.showHelp()
    logger.error('\nport must be a number')
    return process.exit(1)
  }

  const fullConfigPath = resolve(configPath)

  const runServer = async (): Promise<Server> => {
    const typeValidator = createTypeValidator(tsconfigPath, force, schemaPath)
    const configs = await readConfig(fullConfigPath, typeValidator, Mode.Serve)
    return startServer(port, configs, typeValidator)
  }

  if (!watch) {
    try {
      await runServer()
    } catch (err) {
      handleError(err)
    }
    return
  }

  let server = await runServer()
  const restartServer = () =>
    new Promise<void>((resolve, reject) => {
      server.close(async (err) => {
        if (err) return reject(err)

        try {
          server = await runServer()
        } catch (err) {
          return reject(err)
        }
        resolve()
      })
    })

  chokidar.watch(fullConfigPath).on('all', async (e, path) => {
    switch (e) {
      case 'change':
      case 'unlink':
        logger.info('Restarting ncdc serve')

        try {
          await restartServer()
        } catch (err) {
          if (err.code === 'ENOENT') {
            return logger.error(`Could not start server - no such file or directory ${fullConfigPath}`)
          }
          handleError(err)
        }

        break
    }
  })
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
