import { Argv } from 'yargs'
import { HandleError } from '../shared'
import * as consts from '~commands/consts'
import createHandler, { ServeArgs } from './handler'
import { startServer } from './server'
import logger from '~logger'
import loadConfig from '~config/load'
import { TypeValidator } from '~validation'
import Ajv from 'ajv'
import { FsSchemaLoader, SchemaRetriever, WatchingSchemaGenerator } from '~schema'
import { SchemaGenerator } from '~schema'
import { logMetric } from '~metrics'

const builder = (yargs: Argv): Argv<ServeArgs> =>
  yargs
    .positional(consts.CONFIG_PATH, {
      describe: consts.CONFIG_PATH_DESCRIBE,
      type: consts.CONFIG_PATH_TYPE,
    })
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
    .option(consts.SCHEMA_PATH, {
      type: consts.SCHEMA_PATH_TYPE,
      description: consts.SCHEMA_PATH_DESCRIPTION,
    })
    .option(consts.TSCONFIG_PATH, {
      alias: consts.TSCONFIG_ALIAS,
      type: consts.TSCONFIG_TYPE,
      description: consts.TSCONFIG_DESCRIPTION,
      default: consts.TSCONFIG_DEFAULT,
    })
    .option(consts.FORCE_GENERATION, {
      alias: consts.FORCE_GENERATION_ALIAS,
      type: consts.FORCE_GENERATION_TYPE,
      default: false,
      description: consts.FORCE_GENERATION_DESCRIPTION,
    })
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

  return {
    command: 'serve <configPath> [port]',
    describe: 'Serves configured endpoints',
    builder,
    handler: createHandler(handleError, getTypeValidator, startServer, loadConfig),
  }
}
