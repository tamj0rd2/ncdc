import { MockConfig, readConfig, TestConfig } from './config'
import chalk from 'chalk'
import { startServer } from './server'
import TypeValidator from './validation/type-validator'
import { DetailedProblem, Data } from './types'
import CDCTester from './cdc/cdc-tester'
import { mapToProblem } from './messages'
import axios from 'axios'
import { readFileSync } from 'fs'

function rTrunc<T extends { [index: string]: any }>(obj: T): T {
  for (const key in obj) {
    switch (typeof obj[key]) {
      case 'string':
        if (obj[key].length > 30) obj[key] = `${obj[key].substring(0, 50)}...` as any
        break
      case 'object':
        rTrunc(obj[key])
        break
    }
  }

  return obj
}

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
  public constructor(private readonly typeValidator: TypeValidator, private readonly configPath: string) {}

  public async serve(port: number): Promise<void> {
    const mockConfigs = readConfig<MockConfig>(this.configPath).filter(
      x => x.response.mockPath || x.response.mockBody || x.response.body,
    )

    if (!mockConfigs.length) return console.log('No mocks to run')

    let mocksAreValid = true
    mockConfigs.forEach(config => {
      if (config.response.type) {
        if (config.response.mockPath) {
          // TODO: it would be cool to make this async
          config.response.body = JSON.parse(readFileSync(config.response.mockPath, 'utf-8'))
        } else {
          config.response.body = config.response.mockBody ?? config.response.body
        }

        const problems = this.typeValidator.getValidationErrors(config.response.body, config.response.type)
        if (problems.length) {
          mocksAreValid = false
          this.logValidationResults(config)(problems)
        }
      }
    })

    if (mocksAreValid) return startServer(port, mockConfigs)
  }

  public async test(baseUrl: string): Promise<void> {
    const testConfigs = readConfig(this.configPath).filter(x => x.request.endpoint)

    if (!testConfigs.length) return console.log('No tests to run')

    const tester = new CDCTester(
      axios.create({
        baseURL: baseUrl,
      }),
      this.typeValidator,
      mapToProblem,
    )

    await Promise.all(
      testConfigs.map(testConfig =>
        tester.test(testConfig).then(problems => {
          if (!problems.length) {
            console.log(chalk.green.bold('PASSED:'), chalk.green(testConfig.name))
          } else {
            this.logValidationResults(testConfig)
          }
        }),
      ),
    )
  }

  private logValidationResults = ({ name }: TestConfig) => (problems: string | DetailedProblem[]): void => {
    console.error(chalk.red.bold('FAILED:'), chalk.red(name))
    if (typeof problems === 'string') return console.log(problems + `\r\n`)

    groupBy(problems, x => x.dataPath).forEach((groupedProblems, dataPath) => {
      groupedProblems.forEach(({ message }) => console.log(chalk.blue('<root>' + dataPath), message))
      const { data, parentSchema } = groupedProblems[0]

      console.log(chalk.yellow('Data:'))
      console.dir(rTrunc(data), { depth: dataPath ? 4 : 0 })
      if (!!dataPath) {
        console.log(chalk.yellow('Schema:'))
        console.dir(parentSchema)
      }
      console.log()
    })

    console.log()
  }
}
