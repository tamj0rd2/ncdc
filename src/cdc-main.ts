import { tryParseJson } from './io'
import NConfig from './config'
import chalk from 'chalk'
import Logger from './logger'
import CDCTester from './cdc-tester'
import axios from 'axios'
import TypeValidator from './validator'
import Ajv from 'ajv'
import SchemaGenerator from './schema-loader'

export const runTests = async (
  configPath: string,
  baseUrl: string,
  allErrors: boolean,
  tsconfigPath: string,
): Promise<void> => {
  let config: NConfig

  try {
    config = new NConfig(await tryParseJson(configPath as string))
  } catch (err) {
    console.error(`${chalk.bold.red('Config error:')} ${chalk.red(err.message)}`)
    process.exit(1)
  }

  if (!config.configItems || !config.configItems.length) {
    console.log('No tests to run')
    process.exit(0)
  }

  try {
    const logger = new Logger()
    const tester = new CDCTester(
      axios.create({
        baseURL: baseUrl,
      }),
      new TypeValidator(
        new Ajv({ allErrors: allErrors, verbose: true }),
        new SchemaGenerator(tsconfigPath, logger),
      ),
    )

    config.configItems.forEach(async testConfig => {
      tester.test(testConfig).then(problems => {
        if (problems.length) {
          console.error(chalk.red.bold('FAILED:'), chalk.red(testConfig.name))
          problems.forEach(problem =>
            typeof problem === 'string' ? console.log(problem) : console.table(problem),
          )
        } else {
          console.log(chalk.green.bold('PASSED:'), chalk.green(testConfig.name))
        }
      })
    })
  } catch (err) {
    console.error(chalk.red('Something went wrong'), err.stack ?? err)
    process.exit(1)
  }
}
