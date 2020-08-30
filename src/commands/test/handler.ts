import { LoadConfig, LoadConfigStatus } from '~config/load'
import { ValidatedTestConfig, transformConfigs } from './config'
import { red } from 'chalk'
import { TypeValidator } from '~validation'
import { HandleError } from '~commands/shared'
import { NcdcLogger } from '~logger'
import { Resource } from '~config/types'

export interface TestArgs {
  schemaPath?: string
  tsconfigPath: string
  configPath?: string
  baseURL?: string
  force: boolean
  verbose: boolean
  timeout?: number
  rateLimit?: number
}

export type GetTestDeps = (args: TestArgs) => TestDeps
export type RunTests = (
  baseUrl: string,
  configs: Resource[],
  getTypeValidator: GetTypeValidator,
) => Promise<'Success' | 'Failure'>

export interface TestDeps {
  handleError: HandleError
  logger: NcdcLogger
  getTypeValidator(): Promise<TypeValidator>
  runTests: RunTests
  loadConfig: LoadConfig<ValidatedTestConfig>
}

export type GetTypeValidator = () => Promise<TypeValidator>

export const createHandler = (getTestDeps: GetTestDeps) => async (args: TestArgs): Promise<void> => {
  const { handleError, getTypeValidator, loadConfig, runTests } = getTestDeps(args)
  if (!args.configPath) return handleError({ message: `configPath must be specified` })
  if (!args.baseURL) return handleError({ message: 'baseURL must be specified' })

  const loadResult = await loadConfig(args.configPath, getTypeValidator, transformConfigs, true)

  switch (loadResult.type) {
    case LoadConfigStatus.Success:
      break
    case LoadConfigStatus.InvalidConfig:
    case LoadConfigStatus.InvalidBodies:
    case LoadConfigStatus.ProblemReadingConfig:
    case LoadConfigStatus.BodyValidationError:
      return handleError({ message: loadResult.message })
    case LoadConfigStatus.NoConfigs:
      return handleError({ message: red('No configs to test') })
    default:
      return handleError({ message: 'An unknown error ocurred' })
  }

  const testResult = await runTests(args.baseURL, loadResult.configs, getTypeValidator)
  if (testResult === 'Failure') return handleError({ message: 'Not all tests passed' })
}
