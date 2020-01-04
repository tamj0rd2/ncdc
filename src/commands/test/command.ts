import { HandleError, CreateMain } from '../shared'
import { Argv, CommandModule } from 'yargs'
import readConfigOld, { TestConfig } from '../../config/config'
import { createClient } from './http-client'
import axios from 'axios'

interface TestArgs {
  allErrors: boolean
  schemaPath?: string
  tsconfigPath: string
  configPath?: string
  baseURL?: string
}

const builder = (yargs: Argv): Argv<TestArgs> =>
  yargs
    .option('allErrors', {
      alias: 'a',
      type: 'boolean',
      description: 'show all validation errors per test instead of failing fast',
      default: false,
    })
    .option('schemaPath', {
      type: 'string',
      description: 'specify a path to load json schemas from, rather than generating them',
    })
    .option('tsconfigPath', {
      alias: 'c',
      type: 'string',
      description: 'a path to the tsconfig which contains required symbols',
      default: './tsconfig.json',
    })
    .positional('configPath', {
      describe: 'path to the mock config',
      type: 'string',
    })
    .positional('baseURL', {
      describe: 'the URL that your endpoints should be accessed through',
      type: 'string',
    })

const createHandler = (handleError: HandleError, createMain: CreateMain) => (args: TestArgs): void => {
  const { configPath, baseURL, allErrors, tsconfigPath, schemaPath } = args
  if (!configPath || !baseURL) process.exit(1)

  let testConfigs: TestConfig[]
  try {
    testConfigs = readConfigOld(configPath).filter(x => x.request.endpoint)
  } catch (err) {
    return handleError(err)
  }

  if (!testConfigs.length) return console.log('No tests to run')

  createMain(allErrors, tsconfigPath, schemaPath)
    .test(baseURL, createClient(axios.create({ baseURL })), testConfigs)
    .then(() => process.exit())
    .catch(handleError)
}

export default function createTestCommand(
  handleError: HandleError,
  createMain: CreateMain,
): CommandModule<{}, TestArgs> {
  return {
    command: 'test <configPath> <baseURL>',
    describe: 'Tests API endpoint responses against a json schema',
    builder,
    handler: createHandler(handleError, createMain),
  }
}
