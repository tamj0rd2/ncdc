import { Argv } from 'yargs'
import yargs from 'yargs'
import { resolve } from 'path'
import readConfig, { Config, Mode } from '../../config'
import { HandleError, CreateTypeValidator } from '../shared'
import { startServer } from './server'

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

const createHandler = (handleError: HandleError, createTypeValidator: CreateTypeValidator) => async (
  args: ServeArgs,
): Promise<void> => {
  const { configPath, port, allErrors, tsconfigPath, schemaPath } = args
  if (!configPath) process.exit(1)

  if (isNaN(port)) {
    yargs.showHelp()
    console.error('\nport must be a number')
    return process.exit(1)
  }

  const typeValidator = createTypeValidator(allErrors, tsconfigPath, schemaPath)
  const fullConfigPath = resolve(configPath)

  let configs: Config[]
  try {
    configs = await readConfig(fullConfigPath, typeValidator, Mode.Serve)
  } catch (err) {
    return handleError(err)
  }

  if (!configs.length) return console.log('No mocks to run')

  return startServer(port, configs, typeValidator)
    .then(() => process.exit())
    .catch(handleError)
}

export default function createServeCommand(
  handleError: HandleError,
  createTypeValidator: CreateTypeValidator,
): yargs.CommandModule<{}, ServeArgs> {
  return {
    command: 'serve <configPath> [port]',
    describe: 'Serves mock API responses',
    builder,
    handler: createHandler(handleError, createTypeValidator),
  }
}
