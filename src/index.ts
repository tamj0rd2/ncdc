import mainYargs from 'yargs'
import yargs from 'yargs'
import Main from './main'
import TypeValidator from './validation/type-validator'
import ajv from 'ajv'
import SchemaGenerator from './validation/schema-generator'
import chalk from 'chalk'
import readConfig, { MockConfig, TestConfig } from './config'
import { resolve, normalize } from 'path'
import { createClient } from './test/http-client'
import axios from 'axios'
import IOClient from './serve/io-client'
import { generate } from './generate/generate'
import SchemaLoader from './validation/schema-loader'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleError = ({ stack, message }: Error): never => {
  console.error(chalk.red(message))
  process.exit(1)
}

const createMain = (allErrors: boolean, tsconfigPath: string, schemaPath: Optional<string>): Main => {
  try {
    return new Main(
      new TypeValidator(
        new ajv({ verbose: true, allErrors }),
        schemaPath ? new SchemaLoader(schemaPath) : new SchemaGenerator(tsconfigPath),
      ),
    )
  } catch (err) {
    return handleError(err)
  }
}

export default async function run(): Promise<void> {
  // eslint-disable-next-line no-unused-expressions
  mainYargs
    // TODO: look into providing command modules. They should help tidy things up
    // https://github.com/yargs/yargs/blob/master/docs/advanced.md
    .command(
      'serve <configPath> [port]',
      'Serves mock API responses',
      yargs =>
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
          }),
      ({ configPath, port, allErrors, tsconfigPath, schemaPath }) => {
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
      },
    )
    .command(
      'test <configPath> <baseURL>',
      'Tests API endpoint responses against a json schema',
      yargs =>
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
          }),
      ({ configPath, baseURL, allErrors, tsconfigPath, schemaPath }) => {
        if (!configPath || !baseURL) process.exit(1)

        let testConfigs: TestConfig[]
        try {
          testConfigs = readConfig(configPath).filter(x => x.request.endpoint)
        } catch (err) {
          return handleError(err)
        }

        if (!testConfigs.length) return console.log('No tests to run')

        createMain(allErrors, tsconfigPath, schemaPath)
          .test(baseURL, createClient(axios.create({ baseURL })), testConfigs)
          .then(() => process.exit())
          .catch(handleError)
      },
    )
    .command(
      'generate <configPath>',
      'Generates a json schema for the types specified in the config file',
      yargs =>
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
          }),
      yargs => {
        const { tsconfigPath, configPath, outputPath } = yargs
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
      },
    )
    .example(
      'ncdc serve ./service-config.json 4000',
      'Serves the mock API endpoints defined in service-config.json on port 4000',
    )
    .example(
      'ncdc test ./service-config.json https://mysite.com',
      'Tests that the API endpoints defined in service-config.json match the configured body or json schema ',
    )
    .demandCommand()
    .strict()
    .help().argv
}
