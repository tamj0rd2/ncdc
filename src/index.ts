import mainYargs from 'yargs'
import yargs from 'yargs'
import Main from './main'
import TypeValidator from './validation/type-validator'
import ajv from 'ajv'
import SchemaGenerator from './validation/schema-loader'
import chalk from 'chalk'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleError = ({ stack, message }: Error): never => {
  console.error(chalk.red(message))
  process.exit(1)
}

const createMain = (configPath: string, allErrors: boolean, tsconfigPath: string): Main => {
  try {
    return new Main(
      new TypeValidator(new ajv({ verbose: true, allErrors }), new SchemaGenerator(tsconfigPath)),
      configPath,
    )
  } catch (err) {
    return handleError(err)
  }
}

export default async function run(): Promise<void> {
  // eslint-disable-next-line no-unused-expressions
  mainYargs
    .option('tsconfigPath', {
      alias: 'c',
      type: 'string',
      description: 'a path to the tsconfig which contains required symbols',
      default: './tsconfig.json',
    })
    .option('allErrors', {
      alias: 'a',
      type: 'boolean',
      description: 'show all validation errors per test instead of failing fast',
      default: false,
    })
    .command(
      'serve <configPath> [port]',
      'Serves mock API responses',
      yargs =>
        yargs
          .positional('configPath', {
            describe: 'path to the mock config',
            type: 'string',
          })
          .positional('port', {
            describe: 'port to serve the API on',
            type: 'number',
            default: 4000,
          }),
      async ({ configPath, port, allErrors, tsconfigPath }) => {
        if (!configPath) process.exit(1)

        if (isNaN(port)) {
          yargs.showHelp()
          console.error('\nport must be a number')
          return process.exit(1)
        }

        createMain(configPath, allErrors, tsconfigPath)
          .serve(port)
          .then(() => process.exit(0))
          .catch(handleError)
      },
    )
    .command(
      'test <configPath> <baseUrl>',
      'Tests API endpoint responses against a json schema',
      yargs =>
        yargs
          .positional('configPath', {
            describe: 'path to the mock config',
            type: 'string',
          })
          .positional('baseUrl', {
            describe: 'the URL that your endpoints should be accessed through',
            type: 'string',
          }),
      async ({ configPath, baseUrl, allErrors, tsconfigPath }) => {
        if (!configPath || !baseUrl) process.exit(1)

        createMain(configPath, allErrors, tsconfigPath)
          .test(baseUrl)
          .then(() => process.exit(0))
          .catch(handleError)
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
