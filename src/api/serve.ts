import { EventEmitter } from 'events'
import { ReportMetric } from '~commands/shared'
import { BodyValidationError, InvalidBodyTypeError } from '~config/errors'
import { validateConfigBodies } from '~config/validate-config-bodies'
import NcdcServer from '../commands/serve/server/ncdc-server-new'
import { NcdcLogger } from '../logger'
import MetricsReporter from '../metrics'
import TypeValidatorFactory, { TypeValidator } from '../validation'
import { CommonConfig, ServeService } from './types'

export { Method } from '../config'

export async function serve(
  services: ServeService[],
  config: ServeConfig,
  deps: ServeDeps,
): Promise<ServeResult> {
  const { logger } = deps
  const reporter = new MetricsReporter(logger)
  const eventEmitter = new EventEmitter({ captureRejections: true })

  const validatorFactory = new TypeValidatorFactory(logger, reporter.report, {
    force: false,
    watch: config.watch,
    compilerHooks: {
      onSuccess: () => void eventEmitter.emit(Events.TypescriptCompileSucceeded),
      onFail: () => void eventEmitter.emit(Events.TypescriptCompileFailed),
    },
  })

  const getTypeValidator = (): Promise<TypeValidator> =>
    validatorFactory.getValidator({ tsconfigPath: config.tsconfigPath, schemaPath: config.schemaPath })

  if (services.some((s) => s.resources.some((r) => r.request.type || r.response.type))) {
    const typeValidator = await getTypeValidator()

    await Promise.all(
      services.map((s) =>
        validateConfigBodies(s.resources, typeValidator, false)
          .catch((err) => {
            throw new BodyValidationError('dunno', err.message)
          })
          .then((failureMessage) => {
            if (failureMessage) throw new InvalidBodyTypeError('dunno', failureMessage)
          }),
      ),
    )
  }

  const servers = services.map(
    (service) =>
      new NcdcServer(
        service.port,
        getTypeValidator,
        logger.child({ label: service.name }),
        service.resources,
      ),
  )

  const startAll = (): Promise<void[]> => Promise.all(servers.map((server) => server.start()))
  const stopAll = (): Promise<void[]> => Promise.all(servers.map((server) => server.stop()))

  eventEmitter.on(Events.TypescriptCompileSucceeded, async () => {
    logger.info('Attempting to restart ncdc server')
    return stopAll()
      .then(startAll)
      .catch((err) => logger.error(`Could not restart ncdc server\n${err.message}}`))
  })

  eventEmitter.on(Events.TypescriptCompileFailed, () => {
    logger.error('Your source code has compilation errors. Fix them to resume serving endpoints')
    return stopAll()
  })

  await startAll()

  return {
    stop: stopAll,
  }
}

export interface ServeConfig extends CommonConfig {
  watch?: boolean
}

export interface ServeResult {
  stop(): Promise<void[]>
}

interface ServeDeps {
  logger: NcdcLogger
  reportMetric: ReportMetric
}

enum Events {
  TypescriptCompileSucceeded = 'typescriptCompileSucceeded',
  TypescriptCompileFailed = 'typescriptCompileFailed',
}
