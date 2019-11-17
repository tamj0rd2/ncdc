import mainYargs from 'yargs'
import { readFileSync } from 'fs'
import chalk from 'chalk'
import Ajv from 'ajv'
import axios from 'axios'
import { NConfig } from './config'
import CDCTester from './cdc-tester'
import SchemaGenerator from './schema-loader'
import TypeValidator from './validator'
import Logger from './logger'

const handleError = (message: string, err: Error | string): never => {
  console.error(chalk.bold(message))
  console.error(chalk.red(typeof err === 'string' ? err : err.stack))
  process.exit(1)
}

async function tryParseJson<T = object>(path: string): Promise<T> {
  if (path.toLowerCase().startsWith('http')) {
    try {
      const { data } = await axios.get<T>(path)
      return data
    } catch (err) {
      return handleError(`Encountered an error when requesting ${path}`, err)
    }
  }

  let rawFile: string

  try {
    rawFile = readFileSync(path).toString()
  } catch (err) {
    return handleError(`Encountered an error while reading from ${path}`, err)
  }

  try {
    return JSON.parse(rawFile)
  } catch (err) {
    return handleError(`Encountered an error while reading from ${path}`, err)
  }
}

const serveMocks = (config: NConfig, port: number): void => {
  // TODO: Implement this
  console.dir(config, { depth: undefined })
  console.log('port', port)
  console.log('TODO: Implement serving mock API responses')
}

export default async function run(): Promise<void> {
  // eslint-disable-next-line no-unused-expressions
  mainYargs
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
            default: 4000,
          }),
      async argv => {
        if (typeof argv.port !== 'number') {
          console.error('Expected port to be a number but received', argv.port)
          return process.exit(1)
        }

        const config = await tryParseJson<NConfig>(argv.configPath as string)
        serveMocks(config, argv.port)
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
          })
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
          .option('verbose', {
            alias: 'v',
            type: 'boolean',
            description: 'show verbose debugging information',
            default: false,
          }),
      async argv => {
        if (!argv.configPath || !argv.baseUrl) process.exit(1)

        try {
          const config = await tryParseJson<NConfig>(argv.configPath)
          const logger = new Logger()
          const tester = new CDCTester(
            axios.create({
              baseURL: argv.baseUrl,
            }),
            new TypeValidator(
              new Ajv({ allErrors: argv.allErrors, verbose: true }),
              new SchemaGenerator(argv.tsconfigPath, logger),
            ),
          )

          config.tests.forEach(async testConfig => {
            const problems = await tester.test(testConfig)
            if (problems.length) {
              console.error(chalk.red.bold('FAILED:'), chalk.red(testConfig.name))
              problems.forEach(problem =>
                typeof problem === 'string' ? console.log(problem) : console.table(problem),
              )
            } else {
              console.log(chalk.green.bold('PASSED:'), chalk.green(testConfig.name))
            }
          })
        } catch (err) {
          console.error(chalk.red('Something went wrong'), err.stack ?? err)
          process.exit(1)
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
