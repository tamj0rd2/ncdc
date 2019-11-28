import { MockConfig, readConfig, TestConfig } from './config'
import chalk from 'chalk'
import { startServer } from './server'
import TypeValidator from './validation/type-validator'
import { CustomError } from './errors'
import { Problems } from './types'

function rTrunc<T extends { [index: string]: any }>(obj: T): T {
  for (const key in obj) {
    switch (typeof obj[key]) {
      case 'string':
        if (obj[key].length > 30) obj[key] = `${obj[key].substring(0, 30)}...` as any
        break
      case 'object':
        rTrunc(obj[key])
        break
    }
  }

  return obj
}

export default class Main {
  public constructor(private readonly typeValidator: TypeValidator, private readonly configPath: string) {}

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

  private logValidationResults = ({ name }: TestConfig) => (allProblems: Problems): void => {
    if (allProblems.length) {
      console.error(chalk.red.bold('FAILED:'), chalk.red(name))
      return allProblems.forEach(problem => {
        if (typeof problem === 'string') return console.log(problem)

        const { dataPath, message, data, parentSchema } = problem
        console.log(chalk.blue(dataPath || '<root>'), message)
        console.log(chalk.blue('Data:'))
        console.dir(rTrunc(data), { depth: dataPath ? 4 : 0 })
        console.log(chalk.blue('Schema:'))
        console.dir(parentSchema, { depth: dataPath ? 4 : 2 })
        console.log()
      })
    }

    console.log(chalk.green.bold('PASSED:'), chalk.green(name))
  }
}
