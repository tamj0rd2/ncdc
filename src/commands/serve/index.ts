import { GetRootDeps, CommandModule } from '../shared'
import * as consts from '~commands/options'
import createHandler, { ServeArgs, GetServeDeps } from './handler'
import ConfigLoader from '~config/load'
import TypeValidatorFactory, { TypeValidator } from '~validation'
import NcdcServer from './server/ncdc-server'
import { transformResources } from './config'

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
      createServer: (port) => new NcdcServer(port, getTypeValidator, logger),
      getTypeValidator,
      configLoader: new ConfigLoader(getTypeValidator, transformResources, false),
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
        .example(consts.EXAMPLE_SERVE_COMMAND, consts.EXAMPLE_SERVE_DESCRIPTION),
    handler: createHandler(getServeDeps),
  }
}
