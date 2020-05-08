import { HandleError, CreateTypeValidator } from '~commands'
import { resolve } from 'path'
import { transformConfigs, ServeConfig, ValidatedServeConfig } from './config'
import { TypeValidator } from '~validation'
import logger from '~logger'
import chokidar from 'chokidar'
import { StartServerResult } from './server'
import { LoadConfig, LoadConfigStatus } from '~config/load'
import { red } from 'chalk'

export interface ServeArgs {
  configPath?: string
  port: number
  tsconfigPath: string
  schemaPath?: string
  force: boolean
  watch: boolean
}

export type StartServer = (
  port: number,
  routes: ServeConfig[],
  typeValidator?: TypeValidator,
) => StartServerResult

const createHandler = (
  handleError: HandleError,
  createTypeValidator: CreateTypeValidator,
  startServer: StartServer,
  loadConfig: LoadConfig<ValidatedServeConfig>,
) => async (args: ServeArgs): Promise<void> => {
  const { configPath, port, tsconfigPath, schemaPath, force, watch } = args

  if (!configPath) return handleError({ message: 'config path must be supplied' })
  if (isNaN(port)) return handleError({ message: 'port must be a number' })

  const absoluteConfigPath = resolve(configPath)
  let typeValidator: TypeValidator | undefined

  type PrepAndStartResult = {
    startServerResult: StartServerResult
    pathsToWatch: string[]
  }

  const prepAndStartServer = async (): Promise<PrepAndStartResult> => {
    const loadResult = await loadConfig(
      configPath,
      () => {
        if (!typeValidator || schemaPath) {
          typeValidator = createTypeValidator(tsconfigPath, force, schemaPath)
        }
        return typeValidator
      },
      transformConfigs,
    )

    switch (loadResult.type) {
      case LoadConfigStatus.Success:
        break
      case LoadConfigStatus.InvalidConfig:
      case LoadConfigStatus.InvalidBodies:
      case LoadConfigStatus.ProblemReadingConfig:
        throw new Error(loadResult.message)
      case LoadConfigStatus.NoConfigs:
        throw new Error(red('No configs to serve'))
      default:
        throw new Error('An unknown error ocurred')
    }

    const startServerResult = startServer(port, loadResult.configs, typeValidator)
    return {
      startServerResult,
      pathsToWatch: loadResult.absoluteFixturePaths,
    }
  }

  let result: PrepAndStartResult
  try {
    result = await prepAndStartServer()
  } catch (err) {
    return handleError(err)
  }

  if (watch) {
    const fixturesToWatch = [...result.pathsToWatch]
    const chokidarWatchPaths = [absoluteConfigPath, ...fixturesToWatch]
    if (schemaPath) chokidarWatchPaths.push(resolve(schemaPath))

    const configWatcher = chokidar.watch(chokidarWatchPaths, {
      ignoreInitial: true,
    })

    configWatcher.on('all', async (e, path) => {
      logger.info(`${e} event detected for ${path}`)
      logger.info('Attempting to restart ncdc server')

      if (e === 'unlink') {
        // required on some systems https://github.com/paulmillr/chokidar/issues/591
        await configWatcher.unwatch(path)
        configWatcher.add(path)
      }

      try {
        await result.startServerResult.close()
      } catch (err) {
        logger.error(`Could not restart ncdc server\n${err.message}`)
        return
      }

      try {
        result = await prepAndStartServer()
      } catch (err) {
        logger.error(`Could not restart ncdc server\n${err.message}`)
        return
      }

      for (const filePath of result.pathsToWatch) {
        if (!fixturesToWatch.includes(filePath)) {
          configWatcher.add(filePath)
        }
      }

      for (const filePath of fixturesToWatch) {
        if (!result.pathsToWatch.includes(filePath)) {
          // according to the chokidar docs, unwatch is async
          await configWatcher.unwatch(filePath)
        }
      }
    })
  }
}

export default createHandler
