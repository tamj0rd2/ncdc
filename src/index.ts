import mainYargs from 'yargs'
import yargs from 'yargs'
import { runTests } from './cdc/test-main'
import { serveMocks } from './serve/serve-main'

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

        serveMocks(configPath, port, allErrors, tsconfigPath)
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
        runTests(configPath, baseUrl, allErrors, tsconfigPath)
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
