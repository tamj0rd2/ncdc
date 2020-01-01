import mainYargs from 'yargs'
import Main from './main'
import TypeValidator from './validation/type-validator'
import ajv from 'ajv'
import SchemaGenerator from './validation/schema-generator'
import chalk from 'chalk'
import SchemaLoader from './validation/schema-loader'
import { HandleError, CreateMain } from './command-shared'
import createServeCommand from './serve'
import createGenerateCommand from './generate'
import createTestCommand from './test'

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
    .example('ncdc generate ./config.yml', 'Generates json schemas for any Type specified in config.yml')
    .example(
      'ncdc serve ./config.yml 4000',
      'Serves the mock API endpoints defined in config.yml on port 4000',
    )
    .example(
      'ncdc test ./config.yml https://mysite.com',
      'Tests that the responses for the API endpoints defined in config.yml match the configured parameters',
    )
    .demandCommand()
    .strict()
    .help().argv
}
