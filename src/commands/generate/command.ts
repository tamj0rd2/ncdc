import { createCommand } from '../shared'
import * as opts from '~commands/options'
import createHandler, { GenerateArgs, GenerateDeps } from './handler'
import { getConfigTypes } from './config'
import { SchemaGenerator } from '~schema'
import { generate } from './generate'
import TsHelpers from '~schema/ts-helpers'

export const generateCommand = createCommand<GenerateArgs>({
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
  handler: (args, deps) => {
    return createHandler(
      (): GenerateDeps => {
        return {
          logger: deps.logger,
          generate,
          getConfigTypes,
          getSchemaGenerator: () => {
            const tsHelpers = new TsHelpers(deps.reportMetric, deps.logger)
            const generator = new SchemaGenerator(
              tsHelpers.createProgram(args.tsconfigPath, { shouldTypecheck: !args.force }),
            )
            generator.init()
            return generator
          },
        }
      },
    )(args)
  },
})
