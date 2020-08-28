import * as consts from '~commands/options'
import { Argv } from 'yargs'
import createHandler, { ServeArgs, GetServeDeps } from './handler'
import { GetRootDeps } from '~commands/shared'
import TypeValidatorFactory, { TypeValidator } from '~validation'
import loadConfig from '~config/load'
import NcdcServer from '~commands/serve/server/ncdc-server'

const builder = (yargs: Argv): Argv<ServeArgs> =>
  yargs
    .positional(consts.CONFIG_PATH, consts.NEW_CONFIG_PATH_OPTS)
    .option('watch', {
      describe: 'restarts the server when changes to the config file, fixtures or source files are made',
      type: 'boolean',
      default: false,
    })
    .option(consts.SCHEMA_PATH, consts.SCHEMA_PATH_OPTS)
    .option(consts.TSCONFIG_PATH, consts.TSCONFIG_PATH_OPTS)
    .option(consts.FORCE_GENERATION, consts.FORCE_GENERATION_OPTS)
    .check((args) => {
      if (args.watch && args.force) throw new Error('The watch and force flags cannot be used together')
      return args
    })
    .option(consts.VERBOSE, consts.VERBOSE_OPTS)
    .example(consts.EXAMPLE_SERVE_COMMAND, consts.EXAMPLE_SERVE_DESCRIPTION)

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function createNewServeCommand(getCommonDeps: GetRootDeps) {
  const getServeDeps: GetServeDeps = (args, compilerHooks) => {
    const { handleError, logger, reportMetric } = getCommonDeps(args.verbose)
    const typeValidatorFactory = new TypeValidatorFactory(logger, reportMetric, compilerHooks)
    const getTypeValidator = (): Promise<TypeValidator> =>
      typeValidatorFactory.getValidator({
        tsconfigPath: args.tsconfigPath,
        schemaPath: args.schemaPath,
        watch: args.watch,
        force: args.force,
      })

    return {
      handleError,
      getTypeValidator,
      loadConfig,
      logger,
      createServer: (port) => new NcdcServer(port, getTypeValidator, logger),
    }
  }

  return {
    command: 'serve-new [configPath]',
    describe: 'Serves services declared in your config file',
    builder,
    handler: createHandler(getServeDeps),
  }
}
