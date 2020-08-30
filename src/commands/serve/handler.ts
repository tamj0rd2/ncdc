import { resolve } from 'path'
import { transformResources, ValidatedServeConfig } from './config'
import { TypeValidator } from '~validation'
import chokidar from 'chokidar'
import { LoadConfig, LoadConfigStatus } from '~config/load'
import { red } from 'chalk'
import { NcdcLogger } from '~logger'
import { HandleError } from '~commands/shared'
import { CompilerHook } from '~schema/watching-schema-generator'
import { EventEmitter } from 'events'
import { Resource } from '~config/types'

export interface ServeArgs {
  configPath?: string
  port: number
  tsconfigPath: string
  schemaPath?: string
  force: boolean
  watch: boolean
  verbose: boolean
}

interface NcdcServer {
  start(resources: Resource[]): Promise<void>
  stop(): Promise<void>
}

export type CreateServer = (port: number) => NcdcServer

const ATTEMPT_RESTARTING_MSG = 'Attempting to restart ncdc server'
const getFailedRestartMsg = (msg: string): string => `Could not restart ncdc server\n${msg}`

type TypescriptCompilerHooks = {
  onSuccess: CompilerHook
  onFail: CompilerHook
}

export type GetServeDeps = (args: ServeArgs, typescriptCompilerHooks: TypescriptCompilerHooks) => ServeDeps

export type GetTypeValidator = () => Promise<TypeValidator>

interface ServeDeps {
  logger: NcdcLogger
  handleError: HandleError
  getTypeValidator: GetTypeValidator
  createServer: CreateServer
  loadConfig: LoadConfig<ValidatedServeConfig>
}

enum Events {
  TypescriptCompileSucceeded = 'typescriptCompileSucceeded',
  TypescriptCompileFailed = 'typescriptCompileFailed',
}

const createHandler = (getServeDeps: GetServeDeps) => async (args: ServeArgs): Promise<void> => {
  const eventEmitter = new EventEmitter({ captureRejections: true })

  const typescriptCompilerHooks: TypescriptCompilerHooks = {
    onSuccess: () => void eventEmitter.emit(Events.TypescriptCompileSucceeded),
    onFail: () => void eventEmitter.emit(Events.TypescriptCompileFailed),
  }
  const { handleError, logger, loadConfig, createServer, getTypeValidator } = getServeDeps(
    args,
    typescriptCompilerHooks,
  )

  if (!args.configPath) return handleError({ message: 'config path must be supplied' })
  if (isNaN(args.port)) return handleError({ message: 'port must be a number' })
  if (args.watch && args.force)
    return handleError({ message: 'watch and force options cannot be used together' })

  const absoluteConfigPath = resolve(args.configPath)

  type PrepAndStartResult = {
    pathsToWatch: string[]
  }

  let prepAndServeResult: PrepAndStartResult

  const servers: Record<string, NcdcServer> = {
    [args.configPath]: createServer(args.port),
  }

  const stopAllServers = (): Promise<void[]> =>
    Promise.all(Object.values(servers).map((server) => server.stop()))

  const prepAndStartServer = async (): Promise<PrepAndStartResult> => {
    const loadResult = await loadConfig(absoluteConfigPath, getTypeValidator, transformResources, false)

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
