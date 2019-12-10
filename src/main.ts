import { MockConfig, TestConfig } from './config'
import chalk from 'chalk'
import { startServer, RouteConfig } from './serve/server'
import TypeValidator from './validation/type-validator'
import CDCTester from './cdc/cdc-tester'
import axios from 'axios'
import { readFileSync, readFile } from 'fs'
import Problem from './problem'
import { Data, DataObject, DataArray } from './types'

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

  public async serve(port: number, mockConfigs: MockConfig[]): Promise<void> {
    const validateTasks = mockConfigs.map(
      async ({ name, request, response }): Promise<Optional<RouteConfig>> => {
        const body = response.mockPath
          ? await readJsonAsync(response.mockPath)
          : response.mockBody ?? response.body

        if (response.type && body) {
          const problems = await this.typeValidator.getProblems(body, response.type)
          if (problems) {
            console.error(chalk.red.bold('FAILED:'), chalk.red(name))
            this.logValidationErrors(problems)
            return
          }
        }

        return {
          name,
          request: { method: request.method, endpoint: request.mockEndpoint ?? request.endpoint },
          response: { code: response.code, headers: response.headers, body },
        }
      },
    )

    const routes: Optional<RouteConfig>[] = await Promise.all(validateTasks)
    if (!routes.includes(undefined)) return startServer(port, routes as RouteConfig[])
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
      const { name, request: requestConfig, response: responseConfig } = testConfig

      if (!requestConfig.params) {
        return tester
          .test(requestConfig, responseConfig)
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
          .test(requestConfig, responseConfig)
          .then(resultsLogger(displayName, endpoint))
          .catch(this.logTestError(displayName))
      })
    })

    return Promise.all(testTasks)
  }

  private logValidationErrors = (problems: Problem[]): void => {
    groupBy(problems, x => x.path).forEach((groupedProblems, dataPath) => {
      groupedProblems.forEach(({ message }) => console.log(chalk.blue('<root>' + dataPath), message))
      const { data, schema } = groupedProblems[0]

      console.log(chalk.yellow('Data:'))
      console.dir(data, { depth: dataPath ? 4 : 0 })
      if (!!dataPath) {
        console.log(chalk.yellow('Schema:'))
        console.dir(schema)
      }
      console.log()
    })

    console.log()
  }

  private logTestResults = (baseUrl: string) => (displayName: string, endpoint: string) => (
    problems: Problem[],
  ): void => {
    const displayEndpoint = chalk.blue(`${baseUrl}${endpoint}`)
    if (!problems.length) {
      console.log(chalk.green.bold('PASSED:'), chalk.green(displayName), '-', displayEndpoint)
    } else {
      console.error(chalk.red.bold('FAILED:'), chalk.red(displayName), '-', displayEndpoint)
      this.logValidationErrors(problems)
    }
  }

  private logTestError = (displayName: string) => ({ message }: Error): void =>
    console.error(chalk.red.bold('FAILED:'), chalk.red(displayName), '-', message)
}
