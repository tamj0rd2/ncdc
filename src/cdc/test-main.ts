import { TestConfig, readConfig } from '../config'
import chalk from 'chalk'
import CDCTester from './cdc-tester'
import axios from 'axios'
import TypeValidator from '../validation/type-validator'
import Ajv from 'ajv'
import SchemaGenerator from '../validation/schema-loader'
import { getComparisonMessage } from '../messages'

export const runTests = (
  configPath: string,
  baseUrl: string,
  allErrors: boolean,
  tsconfigPath: string,
): void => {
  let testConfigs: TestConfig[]

  try {
    testConfigs = readConfig(configPath).filter(x => x.request.endpoint)
  } catch (err) {
    console.error(chalk.bold.red('Config error:'), chalk.red(err.message))
    process.exit(1)
  }

  if (!testConfigs.length) {
    console.log('No tests to run. You must specify an endpoint')
    process.exit(0)
  }

  try {
    const tester = new CDCTester(
      axios.create({
        baseURL: baseUrl,
      }),
      new TypeValidator(
        new Ajv({ allErrors: allErrors, verbose: true, inlineRefs: true }),
        new SchemaGenerator(tsconfigPath),
        getComparisonMessage,
      ),
      getComparisonMessage,
    )

    testConfigs.forEach(async testConfig => {
      tester.test(testConfig).then(problems => {
        if (problems.length) {
          console.error(chalk.red.bold('FAILED:'), chalk.red(testConfig.name))
          problems.forEach(problem => {
            if (typeof problem === 'string') return console.log(problem)

            const { data, dataPath, expectedType, actualType } = problem
            console.log(chalk.blue('Data path:'), dataPath)
            console.log(chalk.blue('Expected type:'))
            console.dir(expectedType, { depth: undefined })
            console.log(chalk.blue(`Data (${actualType}):`))
            console.dir(data, { depth: undefined })
          })
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
