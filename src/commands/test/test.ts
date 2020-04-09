import { TypeValidator, FetchResource, doItAll } from '~validation'
import { Config } from '~config'
import Problem from '~problem'
import { red, blue } from 'chalk'
import logger from '~logger'
import { testPassed, testFailed, testError } from '~messages'

// TODO: why is this returning a number?
// TODO: reuse this at config type validaiton type
const logTestResults = (baseUrl: string) => (displayName: string, endpoint: string) => (
  problems: Problem[],
): 0 | 1 => {
  const displayEndpoint = blue(`${baseUrl}${endpoint}`)
  if (!problems.length) {
    logger.info(testPassed(displayName, displayEndpoint))
    return 0
  } else {
    logger.error(testFailed(displayName, displayEndpoint, problems))
    return 1
  }
}

const logTestError = (displayName: string) => (err: Error): void => {
  logger.error(testError(displayName, err.message))
}

export const testConfigs = async (
  baseURL: string,
  fetchResource: FetchResource,
  configs: Config[],
  typeValidator: TypeValidator,
): Promise<void | void[]> => {
  const test = doItAll(typeValidator, fetchResource)

  const resultsLogger = logTestResults(baseURL)

  const testTasks = configs.map((testConfig) => {
    return test(testConfig)
      .then(resultsLogger(testConfig.name, testConfig.request.endpoint))
      .catch(logTestError(testConfig.name))
  })

  const results = Promise.all(testTasks)

  if ((await results).includes(1)) throw new Error('Not all tests passed')
}
