import { HandleError } from '../shared'
import { Argv, CommandModule } from 'yargs'
import readConfigOld, { TestConfig } from '../../config/config'
import SchemaGenerator from '../../schema/schema-generator'
import { generate } from './generate'

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

const createHandler = (handleError: HandleError) => (args: GenerateArgs): void => {
  const { tsconfigPath, configPath, outputPath } = args
  if (!configPath) process.exit(1)

  let allConfigs: TestConfig[]
  try {
    allConfigs = readConfigOld(configPath)
  } catch (err) {
    return handleError(err)
  }

  const builtInTypes = ['string', 'number', 'boolean', 'object']
  const types = allConfigs
    .map(x => x.request.type)
    .concat(allConfigs.map(x => x.response.type))
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

  generate(schemaGenerator, types, outputPath)
    .then(() => console.log('Json schemas have been written to disk'))
    .catch(handleError)
}

export default function createGenerateCommand(handleError: HandleError): CommandModule<{}, GenerateArgs> {
  return {
    command: 'generate <configPath>',
    describe: 'Generates a json schema for the types specified in the config file',
    builder,
    handler: createHandler(handleError),
  }
}
