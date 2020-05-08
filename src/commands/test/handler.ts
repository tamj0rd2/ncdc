import { HandleError, CreateTypeValidator } from '~commands'
import { NCDCLogger } from '~logger'
import { TestConfigs } from './test'
import { createHttpClient } from './http-client'
import { LoadConfig, LoadConfigStatus } from '~config/load'
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
  testConfigs: TestConfigs,
  loadConfig: LoadConfig<ValidatedTestConfig>,
) => async (args: TestArgs): Promise<void> => {
  const { configPath, baseURL, tsconfigPath, schemaPath, force } = args
  if (!configPath) return handleError({ message: `configPath must be specified` })
  if (!baseURL) return handleError({ message: 'baseURL must be specified' })

  let typeValidator: TypeValidator | undefined

  const loadResult = await loadConfig(
    configPath,
    () => {
      typeValidator = createTypeValidator(tsconfigPath, force, schemaPath)
      return typeValidator
    },
    transformConfigs,
  )

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

  try {
    await testConfigs(baseURL, createHttpClient(baseURL), loadResult.configs, typeValidator)
  } catch (err) {
    return handleError(err)
  }
}
