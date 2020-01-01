import mainYargs from 'yargs'
import Main from './main'
import TypeValidator from './validation/type-validator'
import ajv from 'ajv'
import SchemaGenerator from './validation/schema-generator'
import chalk from 'chalk'
import readConfig, { TestConfig } from './config'
import { createClient } from './test/http-client'
import axios from 'axios'
import SchemaLoader from './validation/schema-loader'
import createServeCommand from './serve/command'
import { HandleError, CreateMain } from './command-shared'
import createGenerateCommand from './generate/command'
import createTestCommand from './test/command'

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
    .command(createGenerateCommand(handleError))
    .command(createServeCommand(handleError, createMain))
    .command(createTestCommand(handleError, createMain))
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
