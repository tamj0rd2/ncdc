import { MockConfig, readConfig, TestConfig } from './config'
import chalk from 'chalk'
import { startServer } from './server'
import TypeValidator from './validation/type-validator'
import { CustomError } from './errors'
import { Problems } from './types'

export default class Main {
  public constructor(private readonly typeValidator: TypeValidator, private readonly configPath: string) {}

  public async serve(port: number): Promise<void> {
    let mockConfigs: MockConfig[]

    try {
      mockConfigs = readConfig<MockConfig>(this.configPath).filter(
        x => x.response.body ?? x.response.mockBody,
      )
    } catch (err) {
      throw new CustomError(`${chalk.bold.red('Config error:')} ${chalk.red(err.message)}`)
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

    if (!mocksAreValid) {
      throw new CustomError('Some mock configurations were invalid', 1)
    }

    return startServer(port, mockConfigs)
  }

  private logValidationResults = ({ name }: TestConfig) => (problems: Problems): void => {
    if (problems.length) {
      console.error(chalk.red.bold('FAILED:'), chalk.red(name))
      return problems.forEach(problem => {
        if (typeof problem === 'string') return console.log(problem)

        const { data, dataPath, expectedType, actualType } = problem
        console.log(chalk.blue('Data path:'), dataPath)
        console.log(chalk.blue('Expected type:'))
        console.dir(expectedType, { depth: undefined })
        console.log(chalk.blue(`Data (${actualType}):`))
        console.dir(data, { depth: undefined })
        console.log()
      })
    }

    console.log(chalk.green.bold('PASSED:'), chalk.green(name))
  }
}
