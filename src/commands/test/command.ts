import { GetRootDeps } from '../shared'
import { Argv, CommandModule } from 'yargs'
import * as consts from '~commands/options'
import { createHandler, TestArgs, GetTestDeps } from './handler'
import { runTests } from './test'
import loadConfig from '~config/load'
import { FsSchemaLoader } from '~schema'
import { SchemaGenerator } from '~schema'
import Ajv from 'ajv'
import { TypeValidator } from '~validation'

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

export default function createTestCommand(getCommonDeps: GetRootDeps): CommandModule<{}, TestArgs> {
  const getTestDeps: GetTestDeps = (args) => {
    const { force, tsconfigPath, schemaPath } = args
    const { handleError, logger, reportOperation } = getCommonDeps(false)
    return {
      handleError,
      logger,
      loadConfig,
      runTests,
      createTypeValidator: () => {
        const ajv = new Ajv({ verbose: true, allErrors: true })
        if (schemaPath) return new TypeValidator(ajv, new FsSchemaLoader(schemaPath))

        const schemaGenerator = new SchemaGenerator(tsconfigPath, force, reportOperation)
        schemaGenerator.init()
        return new TypeValidator(ajv, schemaGenerator)
      },
    }
  }

  return {
    command: 'test <configPath> <baseURL>',
    describe: 'Tests configured endpoints',
    builder,
    handler: createHandler(getTestDeps),
  }
}
