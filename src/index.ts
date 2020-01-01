import mainYargs from 'yargs'
import Main from './main'
import TypeValidator from './validation/type-validator'
import ajv from 'ajv'
import SchemaGenerator from './validation/schema-generator'
import chalk from 'chalk'
import readConfig, { TestConfig } from './config'
import { createClient } from './test/http-client'
import axios from 'axios'
import { generate } from './generate/generate'
import SchemaLoader from './validation/schema-loader'
import createServeCommand from './serve/command'
import { HandleError, CreateMain } from './command-shared'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleError: HandleError = ({ stack, message }) => {
  console.error(chalk.red(message))
  process.exit(1)
}

const createMain: CreateMain = (allErrors, tsconfigPath, schemaPath) => {
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
  // TODO: figure out how I can remove this
  // eslint-disable-next-line no-unused-expressions
  mainYargs
    .command(createServeCommand(handleError, createMain))
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
