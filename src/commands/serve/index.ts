import { Argv } from 'yargs'
import { GetRootDeps } from '../shared'
import * as consts from '~commands/options'
import createHandler, { ServeArgs, GetServeDeps } from './handler'
import { startServer } from './server'
import loadConfig from '~config/load'
import { TypeValidator } from '~validation'
import Ajv from 'ajv'
import { FsSchemaLoader, WatchingSchemaGenerator } from '~schema'
import { SchemaGenerator } from '~schema'
import createServerLogger from './server/server-logger'

const builder = (yargs: Argv): Argv<ServeArgs> =>
  yargs
    .positional(consts.CONFIG_PATH, consts.CONFIG_PATH_OPTS)
    .positional('port', {
      describe: 'port to serve the API on',
      type: 'number',
      default: 4000,
    })
    .option('watch', {
      describe: 'restarts the server when changes to the config file, fixtures or source files are made',
      type: 'boolean',
      default: false,
    })
    .option(consts.SCHEMA_PATH, consts.SCHEMA_PATH_OPTS)
    .option(consts.TSCONFIG_PATH, consts.TSCONFIG_PATH_OPTS)
    .option(consts.FORCE_GENERATION, consts.FORCE_GENERATION_OPTS)
    .option(consts.VERBOSE, consts.VERBOSE_OPTS)
    .example(consts.EXAMPLE_SERVE_COMMAND, consts.EXAMPLE_SERVE_DESCRIPTION)

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function createServeCommand(getCommonDeps: GetRootDeps) {
  const getServeDeps: GetServeDeps = (args) => {
    const { handleError, logger, reportMetric: reportMetric } = getCommonDeps(args.verbose)

    return {
      handleError,
      logger,
      loadConfig,
      startServer: (routes, typeValidator) => startServer(args.port, routes, typeValidator, logger),
      serverLogger: createServerLogger(args.verbose),
      createTypeValidator: (onReload, onCompilationFailure) => {
        const ajv = new Ajv({ verbose: true, allErrors: true })

        if (args.schemaPath) return new TypeValidator(ajv, new FsSchemaLoader(args.schemaPath))
        if (!args.watch) {
          const generator = new SchemaGenerator(args.tsconfigPath, args.force, reportMetric, logger)
          generator.init()
          return new TypeValidator(ajv, generator)
        }

        const watcher = new WatchingSchemaGenerator(
          args.tsconfigPath,
          logger,
          reportMetric,
          onReload,
          onCompilationFailure,
        )
        watcher.init()
        return new TypeValidator(ajv, watcher)
      },
    }
  }

  return {
    command: 'serve <configPath> [port]',
    describe: 'Serves configured endpoints',
    builder,
    handler: createHandler(getServeDeps),
  }
}
