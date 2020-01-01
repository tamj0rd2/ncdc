import { Argv } from 'yargs'
import yargs = require('yargs')
import { resolve, normalize } from 'path'
import readConfig, { MockConfig } from '../../config'
import IOClient from './io-client'
import { HandleError, CreateMain } from '../shared'

interface ServeArgs {
  configPath?: string
  port: number
  allErrors: boolean
  tsconfigPath: string
  schemaPath?: string
}

const builder = (yargs: Argv): Argv<ServeArgs> =>
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
    .positional('port', {
      describe: 'port to serve the API on',
      type: 'number',
      default: 4000,
    })

const createHandler = (handleError: HandleError, createMain: CreateMain) => (args: ServeArgs): void => {
  const { configPath, port, allErrors, tsconfigPath, schemaPath } = args
  if (!configPath) process.exit(1)

  if (isNaN(port)) {
    yargs.showHelp()
    console.error('\nport must be a number')
    return process.exit(1)
  }

  const fullConfigPath = resolve(configPath)
  const configFolder = normalize(`${fullConfigPath}/../`)

  let mockConfigs: MockConfig[]
  try {
    mockConfigs = readConfig<MockConfig>(fullConfigPath)
      .filter(x => x.response.mockPath || x.response.mockBody || x.response.body)
      .map(config => {
        // TODO: this feels a bit naughty
        const mockPath = config.response.mockPath
        if (!mockPath) return config

        return {
          ...config,
          response: {
            ...config.response,
            mockPath: /^.?.\//.test(mockPath) ? resolve(configFolder, mockPath) : mockPath,
          },
        }
      })
  } catch (err) {
    return handleError(err)
  }

  if (!mockConfigs.length) return console.log('No mocks to run')

  createMain(allErrors, tsconfigPath, schemaPath)
    .serve(port, mockConfigs, new IOClient())
    .then(() => process.exit())
    .catch(handleError)
}

export default function createServeCommand(
  handleError: HandleError,
  createMain: CreateMain,
): yargs.CommandModule<{}, ServeArgs> {
  return {
    command: 'serve <configPath> [port]',
    describe: 'Serves mock API responses',
    builder,
    handler: createHandler(handleError, createMain),
  }
}
