import { readConfig, MockConfig } from '../config'
import chalk from 'chalk'
import { startServer } from './server'

const validateMocks = (mockConfigs: MockConfig[]) => {}

export const serveMocks = (
  configPath: string,
  port: number,
  allErrors: boolean,
  tsconfigPath: string,
): void => {
  // TODO: integrate nodemon to restart on config change

  let mockConfigs: MockConfig[]

  try {
    mockConfigs = readConfig<MockConfig>(configPath).filter(x => x.response.body ?? x.response.mockBody)
  } catch (err) {
    console.error(`${chalk.bold.red('Config error:')} ${chalk.red(err.message)}`)
    process.exit(1)
  }

  if (!mockConfigs.length) {
    console.log('No mocks to run')
    process.exit(0)
  }

  console.log(mockConfigs)
  validateMocks(mockConfigs)
  startServer(port, mockConfigs)
}
