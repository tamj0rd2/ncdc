import { GetRootDeps, CommandModule } from '../shared'
import * as opts from '~commands/options'
import createHandler, { GenerateArgs } from './handler'
import { getConfigTypes } from './config'
import { SchemaGenerator } from '~schema'
import { generate } from './generate'
import TsHelpers from '~schema/ts-helpers'

export default function createGenerateCommand(getCommonDeps: GetRootDeps): CommandModule<GenerateArgs> {
  return {
    command: `generate <${opts.CONFIG_PATHS}..>`,
    describe: 'Generates a json schema for each type specified in the config file',
    builder: (yargs) =>
      yargs
        .positional(opts.CONFIG_PATHS, opts.CONFIG_PATHS_OPTS)
        .option('outputPath', {
          alias: ['o', 'output'],
          type: 'string',
          description: 'sets an output folder for the json schemas',
          default: './json-schema',
        })
        .example(opts.EXAMPLE_GENERATE_COMMAND, opts.EXAMPLE_GENERATE_DESCRIPTION),
    handler: createHandler(({ verbose }) => {
      const { handleError, logger, reportMetric: reportMetric } = getCommonDeps(verbose)
      return {
        handleError,
        logger,
        generate,
        getConfigTypes,
        getSchemaGenerator: (tsconfigPath, force) => {
          const tsHelpers = new TsHelpers(reportMetric, logger)
          const generator = new SchemaGenerator(
            tsHelpers.createProgram(tsconfigPath, { shouldTypecheck: !force }),
          )
          generator.init()
          return generator
        },
      }
    }),
  }
}
