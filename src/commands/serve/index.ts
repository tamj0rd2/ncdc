import { Argv } from 'yargs'
import { HandleError } from '../shared'
import * as consts from '~commands/options'
import createHandler, { ServeArgs } from './handler'
import { startServer } from './server'
import logger from '~logger'
import loadConfig from '~config/load'
import { TypeValidator } from '~validation'
import Ajv from 'ajv'
import { FsSchemaLoader, SchemaRetriever, WatchingSchemaGenerator } from '~schema'
import { SchemaGenerator } from '~schema'
import { logMetric } from '~metrics'
import createServerLogger, { Logger } from './server/server-logger'

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
export default function createServeCommand() {
  const handleError: HandleError = ({ message }) => {
    logger.error(message)
    logMetric('Errored out')
    process.exit(1)
  }

  const getTypeValidator = (
    tsconfigPath: string,
    force: boolean,
    schemaPath: Optional<string>,
    watch: boolean,
    onReload: Optional<() => Promise<void> | void>,
    onCompilationFailure: Optional<() => Promise<void> | void>,
  ): TypeValidator => {
    if (schemaPath) {
      const ajv = new Ajv({ verbose: true, allErrors: true })
      const schemaRetriever = new FsSchemaLoader(schemaPath)
      return new TypeValidator(ajv, schemaRetriever)
    }

    const ajv = new Ajv({ verbose: true, allErrors: true })
    let schemaRetriever: SchemaRetriever

    if (watch) {
      const generator = new WatchingSchemaGenerator(tsconfigPath)
      generator.onReload = onReload
      generator.onCompilationFailure = onCompilationFailure
      schemaRetriever = generator
    } else {
      schemaRetriever = new SchemaGenerator(tsconfigPath, force)
    }

    schemaRetriever.init?.()
    return new TypeValidator(ajv, schemaRetriever)
  }

  const makeServerLogger = (verbose: boolean): Logger =>
    createServerLogger(process.env.LOG_LEVEL ?? (verbose ? 'verbose' : 'info'))

  return {
    command: 'serve <configPath> [port]',
    describe: 'Serves configured endpoints',
    builder,
    handler: createHandler(handleError, getTypeValidator, startServer, loadConfig, makeServerLogger),
  }
}
