import { MockConfig, TestConfig } from './config'
import chalk from 'chalk'
import { startServer, RouteConfig } from './serve/server'
import TypeValidator from './validation/type-validator'
import CDCTester from './cdc/cdc-tester'
import axios from 'axios'
import { readFile } from 'fs'
import Problem from './problem'
import { DataObject, DataArray, Data } from './types'
import { doItAll, GetResponse, ValidationFlags } from './validation/validators'
import { Server } from 'http'

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  return items.reduce((map, item) => {
    const key = getKey(item)
    const collection = map.get(key)
    if (collection) {
      collection.push(item)
    } else {
      map.set(key, [item])
    }
    return map
  }, new Map<string, T[]>())
}

const readJsonAsync = (path: string): Promise<DataObject | DataArray> =>
  new Promise<DataObject | DataArray>((resolve, reject) => {
    readFile(path, (err, data) => {
      if (err) return reject(err)

      try {
        resolve(JSON.parse(data.toString()))
      } catch (err) {
        reject(err)
      }
    })
  })

export default class Main {
  public constructor(private readonly typeValidator: TypeValidator, private readonly configPath: string) {}

  public async serve(port: number, mockConfigs: MockConfig[]): Promise<Server> {
    const responseMap = new Map<string, Optional<Data>>()

    const getResponse: GetResponse<MockConfig> = async ({ name, ...config }) => {
      const { code, mockPath, mockBody, body } = config.response

      let data = responseMap.get(name)
      if (!data) data = mockPath ? await readJsonAsync(mockPath) : mockBody ?? body

      return Promise.resolve({ status: code, data })
    }

    const test = doItAll(this.typeValidator, getResponse, [
      ValidationFlags.RequestType,
      ValidationFlags.ResponseType,
    ])

    // TODO: this is disgusting
    const validateTasks = mockConfigs
      .map(config => ({
        config,
        problems: test(config),
      }))
      .map(async ({ config: { name, request, response }, problems: problemsPromise }) => {
        const problems = await problemsPromise
        if (problems.length) {
          console.error(chalk.red.bold('FAILED:'), chalk.red(name))
          this.logValidationErrors(problems)
          return
        }

        return {
          name,
          request: {
            method: request.method,
            endpoint: request.mockEndpoint ?? request.endpoint,
            bodyType: request.type,
          },
          response: { code: response.code, headers: response.headers, body: responseMap.get(name) },
        }
      })

    const routes: Optional<RouteConfig>[] = await Promise.all(validateTasks)
    if (routes.includes(undefined)) throw new Error('Some mocks were invalid')
    return startServer(port, routes as RouteConfig[], this.typeValidator)
  }

  public async test(baseUrl: string, testConfigs: TestConfig[]): Promise<void | void[]> {
    const tester = new CDCTester(
      axios.create({
        baseURL: baseUrl,
      }),
      this.typeValidator,
    )

    const resultsLogger = this.logTestResults(baseUrl)

    const testTasks = testConfigs.flatMap(testConfig => {
      const { name, request: requestConfig } = testConfig

      if (!requestConfig.params) {
        return tester
          .test(testConfig)
          .then(resultsLogger(name, requestConfig.endpoint))
          .catch(this.logTestError(name))
      }

      return requestConfig.params.map((params, caseIndex) => {
        const displayName = `${name} [${caseIndex}]`
        const actualParams = typeof params === 'string' ? [params] : params
        const paramMatches = requestConfig.endpoint.match(/(:[^/?]+)/g)
        const endpoint =
          paramMatches?.reduce(
            (accum, next, i): string => accum.replace(next, actualParams[i]),
            requestConfig.endpoint,
          ) ?? requestConfig.endpoint

        return tester
          .test(testConfig)
          .then(resultsLogger(displayName, endpoint))
          .catch(this.logTestError(displayName))
      })
    })

    const results = Promise.all(testTasks)

    if ((await results).includes(1)) throw new Error('Not all tests passed')
  }

  private logValidationErrors = (problems: Problem[]): void => {
    groupBy(problems, x => x.path).forEach((groupedProblems, dataPath) => {
      groupBy(groupedProblems, x => x.problemType).forEach((groupedByType, type) => {
        groupedByType.forEach(({ message }) => console.log(chalk.blue(`${type} ${dataPath}`), message))
        const { data, schema } = groupedProblems[0]

        console.log(chalk.yellow('Data:'))
        console.dir(data, { depth: dataPath ? 4 : 0 })
        if (!!dataPath) {
          console.log(chalk.yellow('Schema:'))
          console.dir(schema)
        }
        console.log()
      })
    })

    console.log()
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
      this.logValidationErrors(problems)
      return 1
    }
  }

  private logTestError = (displayName: string) => ({ message }: Error): void =>
    console.error(chalk.red.bold('FAILED:'), chalk.red(displayName), '-', message)
}
