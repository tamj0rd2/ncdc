import { TypeValidator } from '~validation'
import Problem from '~problem'
import { blue } from 'chalk'
import logger from '~logger'
import { testPassed, testFailed, testError } from '~messages'
import { TestConfig } from './config'
import { FetchResource } from './http-client'
import { doItAll } from './validators'

// TODO: why is this returning a number? yeah, what the fuck?
// TODO: reuse this at config type validaiton type. nononononoooooo
const logTestResults = (baseUrl: string) => (displayName: string, endpoint: string) => (
  problems: Public<Problem>[],
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

export const testConfigs = async (
  baseURL: string,
  fetchResource: FetchResource,
  configs: TestConfig[],
  typeValidator: Optional<TypeValidator>,
): Promise<void | void[]> => {
  const test = doItAll(typeValidator, fetchResource)

  const resultsLogger = logTestResults(baseURL)

  const testTasks = configs.map((testConfig) => {
    return test(testConfig)
      .then(resultsLogger(testConfig.name, testConfig.request.endpoint))
      .catch((err) => {
        logger.error(testError(testConfig.name, baseURL + testConfig.request.endpoint, err.message))
        return 1
      })
  })

  const results = Promise.all(testTasks)

  if ((await results).includes(1)) throw new Error('Not all tests passed')
}

export type TestConfigs = typeof testConfigs
