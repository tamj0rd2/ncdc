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
    .option(consts.FORCE_GENERATION, {
      alias: consts.FORCE_GENERATION_ALIAS,
      type: consts.FORCE_GENERATION_TYPE,
      default: false,
      description: consts.FORCE_GENERATION_DESCRIPTION,
    })
    .example(consts.EXAMPLE_GENERATE_COMMAND, consts.EXAMPLE_GENERATE_DESCRIPTION)

export default function createGenerateCommand(): CommandModule<{}, GenerateArgs> {
  const handleError: HandleError = ({ message }) => {
    logger.error(message)
    process.exit(1)
  }

  return {
    command: 'generate <configPath>',
    describe: 'Generates a json schema for each type specified in the config file',
    builder,
    handler: createHandler(
      handleError,
      readGenerateConfig,
      (tsconfigPath, force) => new SchemaGenerator(tsconfigPath, force),
      generate,
      logger,
    ),
  }
}
