import { resolve } from 'path'
import { transformConfigs, ServeConfig, ValidatedServeConfig } from './config'
import { TypeValidator } from '~validation'
import chokidar from 'chokidar'
import { StartServerResult } from './server/app'
import { LoadConfig, LoadConfigStatus } from '~config/load'
import { red } from 'chalk'
import { NcdcLogger } from '~logger'
import { HandleError } from '~commands/shared'
import { CompilerHook } from '~schema/watching-schema-generator'

export interface ServeArgs {
  configPath?: string
  port: number
  tsconfigPath: string
  schemaPath?: string
  force: boolean
  watch: boolean
  verbose: boolean
}

export type StartServer = (
  routes: ServeConfig[],
  typeValidator: TypeValidator | undefined,
) => StartServerResult

const ATTEMPT_RESTARTING_MSG = 'Attempting to restart ncdc server'
const getFailedRestartMsg = (msg: string): string => `Could not restart ncdc server\n${msg}`

export type GetServeDeps = (args: ServeArgs) => ServeDeps
export type CreateTypeValidator = (
  onReload: CompilerHook,
  onCompilationFailure: CompilerHook,
) => Promise<TypeValidator>
interface ServeDeps {
  logger: NcdcLogger
  handleError: HandleError
  createTypeValidator: CreateTypeValidator
  startServer: StartServer
  loadConfig: LoadConfig<ValidatedServeConfig>
}

const createHandler = (getServeDeps: GetServeDeps) => async (args: ServeArgs): Promise<void> => {
  const { handleError, logger, loadConfig, startServer, createTypeValidator } = getServeDeps(args)

  if (!args.configPath) return handleError({ message: 'config path must be supplied' })
  if (isNaN(args.port)) return handleError({ message: 'port must be a number' })
  if (args.watch && args.force)
    return handleError({ message: 'watch and force options cannot be used together' })

  const absoluteConfigPath = resolve(args.configPath)
  let typeValidator: TypeValidator | undefined

  type PrepAndStartResult = {
    startServerResult: StartServerResult
    pathsToWatch: string[]
  }

  let prepAndServeResult: PrepAndStartResult

  const prepAndStartServer = async (): Promise<PrepAndStartResult> => {
    const loadResult = await loadConfig(
      absoluteConfigPath,
      async () => {
        if (args.schemaPath || !typeValidator) {
          const restartServer = async (): Promise<void> => {
            logger.info(ATTEMPT_RESTARTING_MSG)
            try {
              await prepAndServeResult.startServerResult.close()
              prepAndServeResult = await prepAndStartServer()
            } catch (err) {
              logger.error(getFailedRestartMsg(err.message))
            }
          }

          typeValidator = await createTypeValidator(restartServer, () => {
            logger.error('Your source code has compilation errors. Fix them to resume serving endpoints')
          })
        }

        return typeValidator
      },
      transformConfigs,
      false,
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

    const startServerResult = startServer(loadResult.configs, typeValidator)
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

  if (args.watch) {
    const fixturesToWatch = [...prepAndServeResult.pathsToWatch]
    const chokidarWatchPaths = [absoluteConfigPath, ...fixturesToWatch]
    if (args.schemaPath) chokidarWatchPaths.push(resolve(args.schemaPath))

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
