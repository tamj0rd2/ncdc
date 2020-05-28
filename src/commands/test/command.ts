import { HandleError, CreateTypeValidator } from '../shared'
import { Argv, CommandModule } from 'yargs'
import * as consts from '~commands/options'
import { createHandler, TestArgs } from './handler'
import logger from '~logger'
import { runTests } from './test'
import loadConfig from '~config/load'
import { FsSchemaLoader, SchemaRetriever } from '~schema'
import { SchemaGenerator } from '~schema'
import ajv from 'ajv'
import { TypeValidator } from '~validation'
import { logMetric } from '~metrics'

const builder = (yargs: Argv): Argv<TestArgs> =>
  yargs
    .positional(consts.CONFIG_PATH, consts.CONFIG_PATH_OPTS)
    .positional('baseURL', {
      describe: 'the URL that your endpoints should be accessed through',
      type: 'string',
    })
    .option(consts.SCHEMA_PATH, consts.SCHEMA_PATH_OPTS)
    .option(consts.TSCONFIG_PATH, consts.TSCONFIG_PATH_OPTS)
    .option(consts.FORCE_GENERATION, consts.FORCE_GENERATION_OPTS)
    .example(consts.EXAMPLE_TEST_COMMAND, consts.EXAMPLE_TEST_DESCRIPTION)

export default function createTestCommand(): CommandModule<{}, TestArgs> {
  const handleError: HandleError = ({ message }) => {
    logger.error(message)
    logMetric('Sad ending')
    process.exit(1)
  }

  const createTypeValidator: CreateTypeValidator = (tsconfigPath, force, schemaPath) => {
    let schemaRetriever: SchemaRetriever

    if (schemaPath) schemaRetriever = new FsSchemaLoader(schemaPath)
    else {
      const schemaGenerator = new SchemaGenerator(tsconfigPath, force)
      schemaGenerator.init()
      schemaRetriever = schemaGenerator
    }
    return new TypeValidator(new ajv({ verbose: true, allErrors: true }), schemaRetriever)
  }

  return {
    command: 'test <configPath> <baseURL>',
    describe: 'Tests configured endpoints',
    builder,
    handler: createHandler(handleError, createTypeValidator, logger, runTests, loadConfig),
  }
}
