import { HandleError } from '../shared'
import { Argv, CommandModule } from 'yargs'
import * as opts from '~commands/options'
import createHandler, { GenerateArgs } from './handler'
import { getConfigTypes } from './config'
import { SchemaGenerator } from '~schema'
import { generate } from './generate'
import logger from '~logger'

const builder = (yargs: Argv): Argv<GenerateArgs> =>
  yargs
    .positional(opts.CONFIG_PATHS, opts.CONFIG_PATHS_OPTS)
    .option(opts.TSCONFIG_PATH, opts.TSCONFIG_PATH_OPTS)
    .option('outputPath', {
      alias: ['o', 'output'],
      type: 'string',
      description: 'sets an output folder for the json schemas',
      default: './json-schema',
    })
    .option(opts.FORCE_GENERATION, opts.FORCE_GENERATION_OPTS)
    .example(opts.EXAMPLE_GENERATE_COMMAND, opts.EXAMPLE_GENERATE_DESCRIPTION)

export default function createGenerateCommand(handleError: HandleError): CommandModule<{}, GenerateArgs> {
  return {
    command: `generate <${opts.CONFIG_PATHS}..>`,
    describe: 'Generates a json schema for each type specified in the config file',
    builder,
    handler: createHandler(
      handleError,
      getConfigTypes,
      (tsconfigPath, force) => {
        const generator = new SchemaGenerator(tsconfigPath, force)
        generator.init()
        return generator
      },
      generate,
      logger,
    ),
  }
}
