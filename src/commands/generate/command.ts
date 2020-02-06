import { HandleError } from '../shared'
import { Argv, CommandModule } from 'yargs'
import * as consts from '~commands/consts'
import createHandler, { GenerateArgs } from './handler'
import { readGenerateConfig } from './config'
import { SchemaGenerator } from '~schema'
import { generate } from './generate'
import logger from '~logger'

const builder = (yargs: Argv): Argv<GenerateArgs> =>
  yargs
    .positional(consts.CONFIG_PATH, {
      describe: consts.CONFIG_PATH_DESCRIBE,
      type: consts.CONFIG_PATH_TYPE,
    })
    .option(consts.TSCONFIG_PATH, {
      alias: consts.TSCONFIG_ALIAS,
      type: consts.TSCONFIG_TYPE,
      description: consts.TSCONFIG_DESCRIPTION,
      default: consts.TSCONFIG_DEFAULT,
    })
    .option('outputPath', {
      alias: ['o', 'output'],
      type: 'string',
      description: 'sets an output folder for the json schemas',
      default: './json-schema',
    })
    .example(consts.EXAMPLE_GENERATE_COMMAND, consts.EXAMPLE_GENERATE_DESCRIPTION)

export default function createGenerateCommand(
  handleError: HandleError,
  isDevMode: boolean,
): CommandModule<{}, GenerateArgs> {
  return {
    command: 'generate <configPath>',
    describe: 'Generates a json schema for each type specified in the config file',
    builder,
    handler: createHandler(
      handleError,
      isDevMode,
      readGenerateConfig,
      (tsconfigPath, isDevMode) => new SchemaGenerator(tsconfigPath, isDevMode),
      generate,
      logger,
    ),
  }
}
