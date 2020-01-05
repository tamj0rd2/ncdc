import mainYargs from 'yargs'
import chalk from 'chalk'
import { HandleError, CreateTypeValidator } from './commands/shared'
import createServeCommand from './commands/serve'
import createGenerateCommand from './commands/generate'
import createTestCommand from './commands/test'
import TypeValidator from './validation/type-validator'
import ajv from 'ajv'
import SchemaGenerator from './schema/schema-generator'
import SchemaLoader from './schema/schema-loader'

export default async function run(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleError: HandleError = ({ stack, message }) => {
    console.error(chalk.red(message))
    process.exit(1)
  }

  const createTypeValidator: CreateTypeValidator = (allErrors, tsconfigPath, schemaPath) =>
    new TypeValidator(
      new ajv({ verbose: true, allErrors }),
      schemaPath ? new SchemaLoader(schemaPath) : new SchemaGenerator(tsconfigPath),
    )

  // TODO: figure out how I can remove this
  // eslint-disable-next-line no-unused-expressions
  mainYargs
    .command(createGenerateCommand(handleError))
    .command(createServeCommand(handleError, createTypeValidator))
    .command(createTestCommand(handleError, createTypeValidator))
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
