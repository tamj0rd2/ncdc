import { resolve } from 'path'
import { EventEmitter } from 'events'
import type { CompilerHooks, TypeValidator } from '~validation'
import type { HandleError } from '~commands/shared'
import NcdcServer from '~commands/serve/server/ncdc-server'
import { LoadConfigStatus, LoadConfig } from '~config/load'
import { red } from 'chalk'
import chokidar from 'chokidar'
import { ValidatedServeConfig, transformConfigs } from '~commands/serve/config'
import { NcdcLogger } from '~logger'

export interface ServeArgs {
  verbose: boolean
  watch: boolean
  force: boolean
  configPath: string
  tsconfigPath: string
  schemaPath?: string
}

export type CreateServer = (port: number) => NcdcServer

interface ServeDeps {
  getTypeValidator(): Promise<TypeValidator>
  handleError: HandleError
  loadConfig: LoadConfig<ValidatedServeConfig>
  createServer: CreateServer
  logger: NcdcLogger
}

export type GetServeDeps = (args: ServeArgs, compilerHooks: CompilerHooks) => ServeDeps

interface Service {
  configPath: string
  port: number
}

enum Events {
  TypescriptCompileSucceeded = 'typescriptCompileSucceeded',
  TypescriptCompileFailed = 'typescriptCompileFailed',
}

const ATTEMPT_RESTARTING_MSG = 'Attempting to restart ncdc server'
const getFailedRestartMsg = (msg: string): string => `Could not restart ncdc server\n${msg}`

export const createHandler = (getServeDeps: GetServeDeps) => async (args: ServeArgs): Promise<void> => {
  const eventEmitter = new EventEmitter({ captureRejections: true })
  const { handleError, createServer, logger, loadConfig, getTypeValidator } = getServeDeps(args, {
    onSuccess: () => void eventEmitter.emit(Events.TypescriptCompileSucceeded),
    onFail: () => void eventEmitter.emit(Events.TypescriptCompileFailed),
  })

  const ncdcConfigPath = resolve(process.cwd(), args.configPath)
  const defaultExport = (await import(ncdcConfigPath)).default
  const config: Record<string, Service> = defaultExport

  const service = Object.values(config)[0]
  if (!service.configPath) return handleError({ message: 'config path must be supplied' })
  if (isNaN(service.port)) return handleError({ message: 'port must be supplied' })

  type PrepAndStartResult = {
    pathsToWatch: string[]
  }

  let prepAndServeResult: PrepAndStartResult

  const serviceConfigPath = resolve(service.configPath)

  const servers: Record<string, NcdcServer> = {
    [args.configPath]: createServer(service.port),
  }

  const stopAllServers = (): Promise<void[]> =>
    Promise.all(Object.values(servers).map((server) => server.stop()))

  const prepAndStartServer = async (): Promise<PrepAndStartResult> => {
    const loadResult = await loadConfig(serviceConfigPath, getTypeValidator, transformConfigs, false)

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

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const server = servers[args.configPath!]
    await server.start(loadResult.configs)
    return {
      pathsToWatch: loadResult.absoluteFixturePaths,
    }
  }

  eventEmitter.on(Events.TypescriptCompileSucceeded, async () => {
    logger.info(ATTEMPT_RESTARTING_MSG)
    return stopAllServers()
      .then(prepAndStartServer)
      .catch((err) => logger.error(getFailedRestartMsg(err.message)))
  })

  eventEmitter.on(Events.TypescriptCompileFailed, () => {
    logger.error('Your source code has compilation errors. Fix them to resume serving endpoints')
    return stopAllServers()
  })

  try {
    prepAndServeResult = await prepAndStartServer()
  } catch (err) {
    return handleError(err)
  }

  if (args.watch) {
    const fixturesToWatch = [...prepAndServeResult.pathsToWatch]
    const chokidarWatchPaths = [serviceConfigPath, ...fixturesToWatch]
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
        await stopAllServers()
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
