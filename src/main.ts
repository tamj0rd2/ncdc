import readConfig, { MockConfig } from './config'
import chalk from 'chalk'
import { startServer } from './server'
import TypeValidator from './validation/type-validator'
import CDCTester from './cdc/cdc-tester'
import axios from 'axios'
import { readFileSync } from 'fs'
import Problem from './problem'

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

export default class Main {
  public constructor(private readonly typeValidator: TypeValidator, private readonly configPath: string) { }

  public async serve(port: number): Promise<void> {
    const mockConfigs = readConfig<MockConfig>(this.configPath).filter(
      x => x.response.mockPath || x.response.mockBody || x.response.body,
    )

    if (!mockConfigs.length) return console.log('No mocks to run')

    let mocksAreValid = true
    mockConfigs.forEach(({ name, response }) => {
      if (response.type) {
        if (response.mockPath) {
          // TODO: it would be cool to make this async
          response.body = JSON.parse(readFileSync(response.mockPath, 'utf-8'))
        } else {
          response.body = response.mockBody ?? response.body
        }

        const problems = this.typeValidator.getProblems(response.body, response.type)
        if (problems) {
          mocksAreValid = false
          console.error(chalk.red.bold('FAILED:'), chalk.red(name))
          this.logValidationErrors(problems)
        }
      }
    })

    if (mocksAreValid) return startServer(port, mockConfigs)
  }

  public async test(baseUrl: string): Promise<void | void[]> {
    const testConfigs = readConfig(this.configPath).filter(x => x.request.endpoint)
    if (!testConfigs.length) return console.log('No tests to run')

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
          .test(responseConfig, requestConfig.endpoint, requestConfig.method)
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
          .test(responseConfig, endpoint, requestConfig.method)
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
