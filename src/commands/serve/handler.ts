import { HandleError } from '~commands'
import { resolve } from 'path'
import { transformConfigs, ServeConfig, ValidatedServeConfig } from './config'
import { TypeValidator } from '~validation'
import logger from '~logger'
import chokidar from 'chokidar'
import { StartServerResult } from './server'
import { LoadConfig, LoadConfigStatus } from '~config/load'
import { red } from 'chalk'
import { logMetric } from '~metrics'

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

const ATTEMPT_RESTARTING_MSG = 'Attempting to restart ncdc server'
const getFailedRestartMsg = (msg: string): string => `Could not restart ncdc server\n${msg}`

export type CreateServeTypeValidator = (
  tsconfigPath: string,
  force: boolean,
  schemaPath: Optional<string>,
  watch: boolean,
  onReload: () => Promise<void>,
  onCompilationFailure: Optional<() => Promise<void> | void>,
) => TypeValidator

const createHandler = (
  handleError: HandleError,
  createTypeValidator: CreateServeTypeValidator,
  startServer: StartServer,
  loadConfig: LoadConfig<ValidatedServeConfig>,
) => async (args: ServeArgs): Promise<void> => {
  logMetric('Program start')
  const { configPath, port, tsconfigPath, schemaPath, force, watch } = args

  if (!configPath) return handleError({ message: 'config path must be supplied' })
  if (isNaN(port)) return handleError({ message: 'port must be a number' })
  if (watch && force) return handleError({ message: 'watch and force options cannot be used together' })

  const absoluteConfigPath = resolve(configPath)
  let typeValidator: TypeValidator | undefined

  type PrepAndStartResult = {
    startServerResult: StartServerResult
    pathsToWatch: string[]
  }

  let prepAndServeResult: PrepAndStartResult

  const prepAndStartServer = async (): Promise<PrepAndStartResult> => {
    const loadResult = await loadConfig(
      configPath,
      () => {
        if (schemaPath || !typeValidator) {
          const onTypeReload = async (): Promise<void> => {
            logger.info(ATTEMPT_RESTARTING_MSG)
            try {
              await prepAndServeResult.startServerResult.close()
              prepAndServeResult = await prepAndStartServer()
            } catch (err) {
              logger.error(getFailedRestartMsg(err.message))
            }
          }

          typeValidator = createTypeValidator(tsconfigPath, force, schemaPath, watch, onTypeReload, () => {
            logger.error('Your source code has compilation errors. Fix them to resume serving endpoints')
          })
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
      case LoadConfigStatus.BodyValidationError:
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

  try {
    prepAndServeResult = await prepAndStartServer()
  } catch (err) {
    return handleError(err)
  }

  if (watch) {
    const fixturesToWatch = [...prepAndServeResult.pathsToWatch]
    const chokidarWatchPaths = [absoluteConfigPath, ...fixturesToWatch]
    if (schemaPath) chokidarWatchPaths.push(resolve(schemaPath))

    const configWatcher = chokidar.watch(chokidarWatchPaths, {
      ignoreInitial: true,
    })

    configWatcher.on('all', async (e, path) => {
      logger.info(`${e} event detected for ${path}`)

      if (e === 'unlink') {
        // required on some systems https://github.com/paulmillr/chokidar/issues/591
        await configWatcher.unwatch(path)
        configWatcher.add(path)
      }

      logger.info(ATTEMPT_RESTARTING_MSG)

      try {
        await prepAndServeResult.startServerResult.close()
        prepAndServeResult = await prepAndStartServer()
      } catch (err) {
        logger.error(getFailedRestartMsg(err.message))
        return
      }

      for (const filePath of prepAndServeResult.pathsToWatch) {
        if (!fixturesToWatch.includes(filePath)) {
          configWatcher.add(filePath)
        }
      }

      for (const filePath of fixturesToWatch) {
        if (!prepAndServeResult.pathsToWatch.includes(filePath)) {
          // according to the chokidar docs, unwatch is async
          await configWatcher.unwatch(filePath)
        }
      }
    })
  }
}

export default createHandler
