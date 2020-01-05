import { HandleError } from '../shared'
import { Argv, CommandModule } from 'yargs'
import { SchemaGenerator } from '~schema'
import { generate } from './generate'
import { readGenerateConfig, GenerateConfigs } from './config'

interface GenerateArgs {
  configPath?: string
  tsconfigPath: string
  outputPath: string
}

const builder = (yargs: Argv): Argv<GenerateArgs> =>
  yargs
    .positional('configPath', {
      describe: 'path to the mock config',
      type: 'string',
    })
    .option('tsconfigPath', {
      alias: 'c',
      type: 'string',
      description: 'a path to the tsconfig which contains required symbols',
      default: './tsconfig.json',
    })
    .option('outputPath', {
      alias: ['o', 'output'],
      type: 'string',
      description: 'sets an output folder for the json schemas',
      default: './json-schema',
    })

const createHandler = (handleError: HandleError) => async (args: GenerateArgs): Promise<void> => {
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

  if (!types.length) return console.log('No types were specified in the given config file')

  let schemaGenerator: SchemaGenerator

  try {
    schemaGenerator = new SchemaGenerator(tsconfigPath)
  } catch (err) {
    handleError(err)
  }

  try {
    await generate(schemaGenerator, types, outputPath)
  } catch (err) {
    return handleError(err)
  } finally {
    console.log('Json schemas have been written to disk')
  }
}

export default function createGenerateCommand(handleError: HandleError): CommandModule<{}, GenerateArgs> {
  return {
    command: 'generate <configPath>',
    describe: 'Generates a json schema for the types specified in the config file',
    builder,
    handler: createHandler(handleError),
  }
}
