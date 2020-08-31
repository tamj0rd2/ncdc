import { GetRootDeps, CommandModule } from '../shared'
import * as consts from '~commands/options'
import createHandler, { ServeArgs, GetServeDeps } from './handler'
import loadConfig from '~config/load'
import TypeValidatorFactory, { TypeValidator } from '~validation'
import NcdcServer from './server/ncdc-server'

export default function createServeCommand(getCommonDeps: GetRootDeps): CommandModule<ServeArgs> {
  const getServeDeps: GetServeDeps = (args, compilerHooks) => {
    const { handleError, logger, reportMetric } = getCommonDeps(args.verbose)
    const typeValidatorFactory = new TypeValidatorFactory(logger, reportMetric, {
      compilerHooks,
      watch: args.watch,
      force: args.force,
    })
    const getTypeValidator = (): Promise<TypeValidator> =>
      typeValidatorFactory.getValidator({
        tsconfigPath: args.tsconfigPath,
        schemaPath: args.schemaPath,
      })

    return {
      handleError,
      logger,
      loadConfig,
      createServer: (port) => new NcdcServer(port, getTypeValidator, logger),
      getTypeValidator,
    }
  }

  return {
    command: 'serve <configPath> [port]',
    describe: 'Serves configured endpoints',
    builder: (yargs) =>
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
        .example(consts.EXAMPLE_SERVE_COMMAND, consts.EXAMPLE_SERVE_DESCRIPTION),
    handler: createHandler(getServeDeps),
  }
}
