import { TypeValidator, FetchResource, doItAll } from '~validation'
import { Config } from '~config'
import Problem from '~problem'
import { green, red, blue } from 'chalk'
import { logValidationErrors } from '../shared'
import logger from '~logger'

// TODO: reuse this at config type validaiton type
const logTestResults = (baseUrl: string) => (displayName: string, endpoint: string) => (
  problems: Problem[],
): 0 | 1 => {
  const displayEndpoint = blue(`${baseUrl}${endpoint}`)
  if (!problems.length) {
    const message = [green.bold('PASSED:'), green(displayName), '-', displayEndpoint].join(' ')
    logger.info(message)
    return 0
  } else {
    const message = [red.bold('FAILED:'), red(displayName), '-', displayEndpoint].join(' ')
    logger.error(message)
    logValidationErrors(problems)
    return 1
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const logTestError = (displayName: string) => (err: Error): void => {
  logger.error(`${red.bold('FAILED:')} ${red(displayName)} - ${err.message}`, err)
}

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
      .then(resultsLogger(testConfig.name, testConfig.request.endpoint))
      .catch(logTestError(testConfig.name))
  })

  const results = Promise.all(testTasks)

  if ((await results).includes(1)) throw new Error('Not all tests passed')
}
