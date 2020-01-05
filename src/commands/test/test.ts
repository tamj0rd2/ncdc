import TypeValidator from '~validation/type-validator'
import { FetchResource, doItAll } from '~validation/validators'
import { Config } from '~config'
import Problem from '~problem'
import chalk from 'chalk'
import { logValidationErrors } from '~mode-shared'

const logTestResults = (baseUrl: string) => (displayName: string, endpoint: string) => (
  problems: Problem[],
): 0 | 1 => {
  const displayEndpoint = chalk.blue(`${baseUrl}${endpoint}`)
  if (!problems.length) {
    console.log(chalk.green.bold('PASSED:'), chalk.green(displayName), '-', displayEndpoint)
    return 0
  } else {
    console.error(chalk.red.bold('FAILED:'), chalk.red(displayName), '-', displayEndpoint)
    logValidationErrors(problems)
    return 1
  }
}

const logTestError = (displayName: string) => ({ message }: Error): void =>
  console.error(chalk.red.bold('FAILED:'), chalk.red(displayName), '-', message)

export const testConfigs = async (
  baseURL: string,
  fetchResource: FetchResource,
  configs: Config[],
  typeValidator: TypeValidator,
): Promise<void | void[]> => {
  const test = doItAll(typeValidator, fetchResource)

  const resultsLogger = logTestResults(baseURL)

  const testTasks = configs.map(testConfig => {
    return test(testConfig)
      .then(resultsLogger(name, testConfig.request.endpoint))
      .catch(logTestError(name))
  })

  const results = Promise.all(testTasks)

  if ((await results).includes(1)) throw new Error('Not all tests passed')
}
