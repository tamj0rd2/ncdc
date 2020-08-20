import { GetRootDeps } from '../shared'
import { Argv, CommandModule } from 'yargs'
import * as opts from '~commands/options'
import { createHandler, TestArgs, GetTestDeps } from './handler'
import { runTests } from './test'
import loadConfig from '~config/load'
import { FsSchemaLoader } from '~schema'
import { SchemaGenerator } from '~schema'
import Ajv from 'ajv'
import { TypeValidator } from '~validation'
import { createHttpClient } from './http-client'
import TsHelpers from '~schema/ts-helpers'

const builder = (yargs: Argv): Argv<TestArgs> =>
  yargs
    .positional(opts.CONFIG_PATH, opts.CONFIG_PATH_OPTS)
    .positional('baseURL', {
      describe: 'the URL that your endpoints should be accessed through',
      type: 'string',
    })
    .option('timeout', {
      description: 'req/res timeout in ms',
      type: 'number',
    })
    .option('rateLimit', {
      description: 'minimum time in ms to wait between sending each request',
      type: 'number',
    })
    .option(opts.SCHEMA_PATH, opts.SCHEMA_PATH_OPTS)
    .option(opts.TSCONFIG_PATH, opts.TSCONFIG_PATH_OPTS)
    .option(opts.FORCE_GENERATION, opts.FORCE_GENERATION_OPTS)
    .option(opts.VERBOSE, opts.VERBOSE_OPTS)
    .example(opts.EXAMPLE_TEST_COMMAND, opts.EXAMPLE_TEST_DESCRIPTION)

export default function createTestCommand(getCommonDeps: GetRootDeps): CommandModule<{}, TestArgs> {
  const getTestDeps: GetTestDeps = (args) => {
    const { force, tsconfigPath, schemaPath, verbose } = args
    const { handleError, logger, reportMetric: reportMetric } = getCommonDeps(verbose)
    return {
      handleError,
      logger,
      loadConfig,
      runTests: (baseUrl, configs, getTypeValidator) =>
        runTests(
          baseUrl,
          createHttpClient(baseUrl, args.timeout, args.rateLimit),
          configs,
          getTypeValidator,
          logger,
          reportMetric,
        ),
      createTypeValidator: () => {
        const ajv = new Ajv({ verbose: true, allErrors: true })
        if (schemaPath) return Promise.resolve(new TypeValidator(ajv, new FsSchemaLoader(schemaPath)))

        const tsHelpers = new TsHelpers(reportMetric, logger)
        const schemaGenerator = new SchemaGenerator(
          tsHelpers.createProgram(tsconfigPath, { shouldTypecheck: !force }),
          force,
          reportMetric,
          logger,
        )
        schemaGenerator.init()
        return Promise.resolve(new TypeValidator(ajv, schemaGenerator))
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
