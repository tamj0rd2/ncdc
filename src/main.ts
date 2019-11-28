import { MockConfig, readConfig, TestConfig } from './config'
import chalk from 'chalk'
import { startServer } from './server'
import TypeValidator from './validation/type-validator'
import { CustomError } from './errors'
import { DetailedProblem } from './types'

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
  public constructor(private readonly typeValidator: TypeValidator, private readonly configPath: string) { }

  public async serve(port: number): Promise<void> {
    let mockConfigs: MockConfig[]

    try {
      mockConfigs = readConfig<MockConfig>(this.configPath, true).filter(
        x => x.response.body ?? x.response.mockBody,
      )
    } catch (err) {
      throw new CustomError(`${chalk.bold('Config error:')} ${err.message}`)
    }

    if (!mockConfigs.length) {
      console.log('No mocks to run')
      return
    }

    let mocksAreValid = true
    mockConfigs.forEach(config => {
      if (config.response.type) {
        const body = config.response.mockBody ?? config.response.body
        const problems = this.typeValidator.getValidationErrors(body, config.response.type)
        if (problems) {
          mocksAreValid = false
          this.logValidationResults(config)(problems)
        }
      }
    })

    if (mocksAreValid) startServer(port, mockConfigs)
  }

  private logValidationResults = ({ name }: TestConfig) => (problems: DetailedProblem[]): void => {
    if (problems.length) {
      console.error(chalk.red.bold('FAILED:'), chalk.red(name))
    } else {
      console.log(chalk.green.bold('PASSED:'), chalk.green(name))
    }

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
