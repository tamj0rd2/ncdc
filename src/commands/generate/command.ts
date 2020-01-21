import { HandleError } from '../shared'
import { Argv, CommandModule } from 'yargs'
import { SchemaGenerator } from '~schema'
import { generate } from './generate'
import { readGenerateConfig, GenerateConfigs } from './config'
import logger from '~logger'
import * as consts from '~commands/consts'

interface GenerateArgs {
  configPath?: string
  tsconfigPath: string
  outputPath: string
}

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

const createHandler = (handleError: HandleError, isDevMode: boolean) => async (
  args: GenerateArgs,
): Promise<void> => {
  const { tsconfigPath, configPath, outputPath } = args
  if (!configPath) process.exit(1)

  let configs: GenerateConfigs
  try {
    configs = await readGenerateConfig(configPath)
  } catch (err) {
    return handleError(err)
  }

  const builtInTypes = ['string', 'number', 'boolean', 'object']
  const types = configs
    .map(x => x.request.type)
    .concat(configs.map(x => x.response.type))
    .filter((x): x is string => !!x)
    .filter(x => !builtInTypes.includes(x))
    .filter((x, i, arr) => i === arr.indexOf(x))

  if (!types.length) {
    logger.info('No types were specified in the given config file')
    return
  }

  let schemaGenerator: SchemaGenerator

  try {
    schemaGenerator = new SchemaGenerator(tsconfigPath, isDevMode)
  } catch (err) {
    handleError(err)
  }

  try {
    await generate(schemaGenerator, types, outputPath)
  } catch (err) {
    return handleError(err)
  } finally {
    logger.info('Json schemas have been written to disk')
  }
}

export default function createGenerateCommand(
  handleError: HandleError,
  isDevMode: boolean,
): CommandModule<{}, GenerateArgs> {
  return {
    command: 'generate <configPath>',
    describe: 'Generates a json schema for each type specified in the config file',
    builder,
    handler: createHandler(handleError, isDevMode),
  }
}
