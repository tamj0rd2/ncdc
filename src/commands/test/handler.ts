import { RunTests } from './test'
import { createHttpClient } from './http-client'
import { LoadConfig, LoadConfigStatus, GetTypeValidator } from '~config/load'
import { ValidatedTestConfig, transformConfigs } from './config'
import { red } from 'chalk'
import { TypeValidator } from '~validation'
import { HandleError } from '~commands/shared'
import { NcdcLogger } from '~logger'

export interface TestArgs {
  schemaPath?: string
  tsconfigPath: string
  configPath?: string
  baseURL?: string
  force: boolean
}

export type GetTestDeps = (args: TestArgs) => TestDeps
export interface TestDeps {
  handleError: HandleError
  logger: NcdcLogger
  createTypeValidator: () => TypeValidator
  runTests: RunTests
  loadConfig: LoadConfig<ValidatedTestConfig>
}

export type CreateTypeValidator = () => TypeValidator

export const createHandler = (getTestDeps: GetTestDeps) => async (args: TestArgs): Promise<void> => {
  const { handleError, logger, createTypeValidator, loadConfig, runTests } = getTestDeps(args)
  if (!args.configPath) return handleError({ message: `configPath must be specified` })
  if (!args.baseURL) return handleError({ message: 'baseURL must be specified' })

  let typeValidator: TypeValidator | undefined
  const getTypeValidator: GetTypeValidator = () => {
    if (!typeValidator) typeValidator = createTypeValidator()
    return typeValidator
  }

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

  const testResult = await runTests(
    args.baseURL,
    createHttpClient(args.baseURL),
    loadResult.configs,
    getTypeValidator,
    logger,
  )
  if (testResult === 'Failure') return handleError({ message: 'Not all tests passed' })
}
