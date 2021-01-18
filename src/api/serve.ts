import NcdcServer from '../commands/serve/server/ncdc-server-new'
import createNcdcLogger from '../logger'
import MetricsReporter from '../metrics'
import TypeValidatorFactory from '../validation'
import { CommonConfig, Service } from './types'

export { Method } from '../config'

export async function serve(services: Service[], config: ServeConfig): Promise<ServeResult> {
  const logger = createNcdcLogger(config.verbose ?? false)
  const reporter = new MetricsReporter(logger)
  const validatorFactory = new TypeValidatorFactory(logger, reporter.report, {
    force: false,
    watch: config.watch,
    compilerHooks: {
      onSuccess: () => {
        console.log('successfully compiled')
      },
      onFail: () => {
        console.log('failed to compile')
      },
    },
  })

  const servers = services.map(
    (service) =>
      new NcdcServer(
        service.port,
        () =>
          validatorFactory.getValidator({
            tsconfigPath: config.tsconfigPath,
            schemaPath: config.schemaPath,
          }),
        logger.child({ label: service.name }),
        service.resources,
      ),
  )

  await Promise.all(servers.map((server) => server.start()))

  return {
    stop: () => Promise.all(servers.map((server) => server.stop())).then(() => undefined),
  }
}

export interface ServeConfig extends CommonConfig {
  watch?: boolean
}

export interface ServeResult {
  stop(): Promise<void>
}
