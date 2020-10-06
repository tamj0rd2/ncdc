import { TypeValidator } from '~validation'
import chokidar from 'chokidar'
import { LoadConfigResponse } from '~config/load'
import { NcdcLogger } from '~logger'
import { CompilerHook } from '~schema/watching-schema-generator'
import { EventEmitter } from 'events'
import { Resource } from '~config'
import { NoServiceResourcesError } from '~config/errors'

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

export interface ConfigLoader {
  load(configPath: string): Promise<LoadConfigResponse>
}

export interface ServeDeps {
  logger: NcdcLogger
  createServer: CreateServer
  configLoader: ConfigLoader
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
  const { logger, configLoader, createServer } = getServeDeps(args, typescriptCompilerHooks)

  if (!args.configPath) throw new Error('config path must be supplied')
  if (isNaN(args.port)) throw new Error('port must be a number')
  if (args.watch && args.force) throw new Error('watch and force options cannot be used together')

  const configPath = args.configPath

  type PrepAndStartResult = {
    pathsToWatch: string[]
  }

  const servers: Record<string, NcdcServer> = {
    [args.configPath]: createServer(args.port),
  }

  const stopAllServers = (): Promise<void[]> =>
    Promise.all(Object.values(servers).map((server) => server.stop()))

  const prepAndStartServer = async (): Promise<PrepAndStartResult> => {
    try {
      const loadResult = await configLoader.load(configPath)

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const server = servers[args.configPath!]
      await server.start(loadResult.configs)
      return {
        pathsToWatch: loadResult.fixturePaths,
      }
    } catch (err) {
      if (err instanceof NoServiceResourcesError) {
        err.message = err.formatCustomMessage('No configs to serve')
      }

      throw err
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

  let prepAndServeResult = await prepAndStartServer()

  if (args.watch) {
    const fixturesToWatch = [...prepAndServeResult.pathsToWatch]
    const chokidarWatchPaths = [configPath, ...fixturesToWatch]
    if (args.schemaPath) chokidarWatchPaths.push(args.schemaPath)

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
