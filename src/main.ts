import { MockConfig, readConfig } from './config'
import chalk from 'chalk'
import { startServer } from './server'
import TypeValidator from './validation/type-validator'
import { CustomError } from './errors'

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
        const result = this.typeValidator.getValidationErrors(body, config.response.type)
        if (result) {
          mocksAreValid = false
          console.error(chalk.red.bold('Invalid mock:'), chalk.red(config.name))
          console.table(result)
        }
      }
    })

    if (!mocksAreValid) {
      throw new CustomError('Some mock configurations were invalid', 1)
    }

    return startServer(port, mockConfigs)
  }
}
