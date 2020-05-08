import { HandleError, CreateTypeValidator } from '~commands'
import { NCDCLogger } from '~logger'
import { RunTests } from './test'
import { createHttpClient } from './http-client'
import { LoadConfig, LoadConfigStatus, GetTypeValidator } from '~config/load'
import { ValidatedTestConfig, transformConfigs } from './config'
import { red } from 'chalk'
import { TypeValidator } from '~validation'

export interface TestArgs {
  schemaPath?: string
  tsconfigPath: string
  configPath?: string
  baseURL?: string
  force: boolean
}

export const createHandler = (
  handleError: HandleError,
  createTypeValidator: CreateTypeValidator,
  logger: NCDCLogger,
  runTests: RunTests,
  loadConfig: LoadConfig<ValidatedTestConfig>,
) => async (args: TestArgs): Promise<void> => {
  const { configPath, baseURL, tsconfigPath, schemaPath, force } = args
  if (!configPath) return handleError({ message: `configPath must be specified` })
  if (!baseURL) return handleError({ message: 'baseURL must be specified' })

  let typeValidator: TypeValidator | undefined
  const getTypeValidator: GetTypeValidator = () => {
    if (!typeValidator) typeValidator = createTypeValidator(tsconfigPath, force, schemaPath)
    return typeValidator
  }

  const loadResult = await loadConfig(configPath, getTypeValidator, transformConfigs)

  switch (loadResult.type) {
    case LoadConfigStatus.Success:
      break
    case LoadConfigStatus.InvalidConfig:
    case LoadConfigStatus.InvalidBodies:
    case LoadConfigStatus.ProblemReadingConfig:
      return handleError({ message: loadResult.message })
    case LoadConfigStatus.NoConfigs:
      return handleError({ message: red('No configs to test') })
    default:
      return handleError({ message: 'An unknown error ocurred' })
  }

  const testResult = await runTests(
    baseURL,
    createHttpClient(baseURL),
    loadResult.configs,
    getTypeValidator,
    logger,
  )
  if (testResult === 'Failure') return handleError({ message: 'Not all tests passed' })
}
