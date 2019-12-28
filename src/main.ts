import { MockConfig, TestConfig } from './config'
import chalk from 'chalk'
import { startServer, RouteConfig } from './serve/server'
import TypeValidator from './validation/type-validator'
import Problem from './problem'
import { doItAll, FetchResource, ValidationFlags } from './validation/validators'
import { Server } from 'http'
import IOClient from './serve/io-client'
import { logValidationErrors } from './mode-shared'

export default class Main {
  public constructor(private readonly typeValidator: TypeValidator) {}

  public async serve(port: number, mockConfigs: MockConfig[], ioClient: IOClient): Promise<Server> {
    const test = doItAll(this.typeValidator, ioClient.fetch, [
      ValidationFlags.RequestType,
      ValidationFlags.ResponseType,
    ])

    const getRouteConfigTasks = mockConfigs.map(async config => {
      const problems = await test(config)

      const { name, request, response } = config
      if (problems.length) {
        console.error(chalk.red.bold('FAILED:'), chalk.red(name))
        logValidationErrors(problems)
        return
      }

      return {
        name,
        request: {
          method: request.method,
          endpoint: request.mockEndpoint ?? request.endpoint,
          bodyType: request.type,
        },
        response: {
          code: response.code,
          headers: response.headers,
          body: (await ioClient.fetch(config)).data,
        },
      }
    })

    const routes: Optional<RouteConfig>[] = await Promise.all(getRouteConfigTasks)
    if (routes.includes(undefined)) throw new Error('Some mocks were invalid')
    return startServer(port, routes as RouteConfig[], this.typeValidator)
  }

  public async test(
    baseURL: string,
    fetchResource: FetchResource,
    testConfigs: TestConfig[],
  ): Promise<void | void[]> {
    const test = doItAll(this.typeValidator, fetchResource)

    const resultsLogger = this.logTestResults(baseURL)

    const testTasks = testConfigs.flatMap(testConfig => {
      const { name, request: requestConfig } = testConfig

      if (!requestConfig.params) {
        return test(testConfig)
          .then(resultsLogger(name, requestConfig.endpoint))
          .catch(this.logTestError(name))
      }

      return requestConfig.params.map((params, caseIndex) => {
        const displayName = `${name} [${caseIndex}]`
        const actualParams = typeof params === 'string' ? [params] : params
        const paramMatches = requestConfig.endpoint.match(/(:[^/?]+)/g)
        const transformedEndpoint =
          paramMatches?.reduce(
            (accum, next, i): string => accum.replace(next, actualParams[i]),
            requestConfig.endpoint,
          ) ?? requestConfig.endpoint

        return test({ ...testConfig, request: { ...testConfig.request, endpoint: transformedEndpoint } })
          .then(resultsLogger(displayName, transformedEndpoint))
          .catch(this.logTestError(displayName))
      })
    })

    const results = Promise.all(testTasks)

    if ((await results).includes(1)) throw new Error('Not all tests passed')
  }

  private logTestResults = (baseUrl: string) => (displayName: string, endpoint: string) => (
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

  private logTestError = (displayName: string) => ({ message }: Error): void =>
    console.error(chalk.red.bold('FAILED:'), chalk.red(displayName), '-', message)
}
