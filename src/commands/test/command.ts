import { GetRootDeps, CommandModule } from '../shared'
import * as opts from '~commands/options'
import { createHandler, TestArgs, GetTestDeps, GetTypeValidator } from './handler'
import { runTests } from './test'
import TypeValidatorFactory from '~validation'
import { createHttpClient } from './http-client'
import ConfigLoader from '~config/load'
import { transformConfigs } from './config'

export default function createTestCommand(getCommonDeps: GetRootDeps): CommandModule<TestArgs> {
  const getTestDeps: GetTestDeps = (args) => {
    const { force, tsconfigPath, schemaPath, verbose } = args
    const { handleError, logger, reportMetric: reportMetric } = getCommonDeps(verbose)
    const typeValidatorFactory = new TypeValidatorFactory(logger, reportMetric, { force })
    const getTypeValidator: GetTypeValidator = () =>
      typeValidatorFactory.getValidator({ tsconfigPath, schemaPath })

    return {
      handleError,
      logger,
      runTests: (baseUrl, configs, getTypeValidator) =>
        runTests(
          baseUrl,
          createHttpClient(baseUrl, args.timeout, args.rateLimit),
          configs,
          getTypeValidator,
          logger,
          reportMetric,
        ),
      getTypeValidator,
      configLoader: new ConfigLoader(getTypeValidator, transformConfigs, true),
    }
  }

  return {
    command: 'test <configPath> <baseURL>',
    describe: 'Tests configured endpoints',
    builder: (yargs) =>
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
        .example(opts.EXAMPLE_TEST_COMMAND, opts.EXAMPLE_TEST_DESCRIPTION),
    handler: createHandler(getTestDeps),
  }
}
