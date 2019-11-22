import { readConfig, MockConfig } from '../config'
import chalk from 'chalk'
import { startServer } from './server'
import TypeValidator from '../validation/type-validator'
import ajv from 'ajv'
import SchemaGenerator from '../validation/schema-loader'
import { getComparisonMessage } from '../messages'

const validateMocks = (mockConfigs: MockConfig[], tsconfigPath: string, allErrors: boolean): boolean => {
  let isValid = true
  const typeValidator = new TypeValidator(
    new ajv({ verbose: true, allErrors }),
    new SchemaGenerator(tsconfigPath),
    getComparisonMessage,
  )

  mockConfigs.forEach(config => {
    if (config.response.type) {
      const body = config.response.mockBody ?? config.response.body
      const result = typeValidator.getValidationErrors(body, config.response.type)
      if (result) {
        isValid = false
        console.error(chalk.red.bold('Invalid mock:'), chalk.red(config.name))
        console.dir(result, { depth: undefined })
      }
    }
  })

  return isValid
}

export const serveMocks = (
  configPath: string,
  port: number,
  allErrors: boolean,
  tsconfigPath: string,
): void => {
  // TODO: integrate nodemon to restart on config or mock file change

  let mockConfigs: MockConfig[]

  try {
    mockConfigs = readConfig<MockConfig>(configPath).filter(
      x => (x.response.body ?? x.response.mockBody) && (x.request.mockEndpoint ?? x.request.endpoint),
    )
  } catch (err) {
    console.error(`${chalk.bold.red('Config error:')} ${chalk.red(err.message)}`)
    process.exit(1)
  }

  try {
    if (!mockConfigs.length) {
      console.log('No mocks to run')
      process.exit(0)
    }

    if (!validateMocks(mockConfigs, tsconfigPath, allErrors)) {
      process.exit(1)
    }

    startServer(port, mockConfigs)
  } catch (err) {
    console.error(`${chalk.bold.red('Config error:')} ${chalk.red(err.message)}`)
    process.exit(1)
  }
}
