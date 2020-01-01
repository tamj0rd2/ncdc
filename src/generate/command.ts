import { HandleError } from '../command-shared'
import { Argv, CommandModule } from 'yargs'
import readConfig, { TestConfig } from '../config'
import SchemaGenerator from '../validation/schema-generator'
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
    allConfigs = readConfig(configPath)
  } catch (err) {
    return handleError(err)
  }

  if (!allConfigs.length) return console.log('No types to generate schemas for')

  const builtInTypes = ['string', 'number', 'boolean', 'object']
  const types = allConfigs
    .map(x => x.request.type)
    .concat(allConfigs.map(x => x.response.type))
    .filter((x): x is string => !!x)
    .filter(x => !builtInTypes.includes(x))
    .filter((x, i, arr) => i === arr.indexOf(x))

  try {
    const schemaLoader = new SchemaGenerator(tsconfigPath)
    generate(schemaLoader, types, outputPath)
      .then(() => console.log('Json schemas have been written to disk'))
      .catch(handleError)
  } catch (err) {
    handleError(err)
  }
}

export default function createGenerateModule(handleError: HandleError): CommandModule<{}, GenerateArgs> {
  return {
    command: 'test <configPath> <baseURL>',
    describe: 'Tests API endpoint responses against a json schema',
    builder,
    handler: createHandler(handleError),
  }
}
