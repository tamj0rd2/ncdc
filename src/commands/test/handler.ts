import { HandleError, CreateTypeValidator } from '~commands'
import readConfig, { Config } from '~config-old'
import { Mode } from '~config-old/types'
import { NCDCLogger } from '~logger'
import { TestConfigs } from './test'
import { createHttpClient } from './http-client'
import { existsSync } from 'fs'
import { resolve } from 'path'

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
) => async (args: TestArgs): Promise<void> => {
  const { configPath, baseURL, tsconfigPath, schemaPath, force } = args
  if (!configPath) return handleError({ message: `configPath must be specified` })
  if (!baseURL) return handleError({ message: 'baseURL must be specified' })

  const fullTsconfigPath = resolve(tsconfigPath)
  if (!existsSync(fullTsconfigPath)) {
    return handleError({ message: `${fullTsconfigPath} does not exist` })
  }

  const typeValidator = createTypeValidator(tsconfigPath, force, schemaPath)

  let configs: Config[]
  try {
    configs = await readConfig(configPath, typeValidator, Mode.Test)
  } catch (err) {
    return handleError(err)
  }

  if (!configs.length) {
    logger.warn('No tests to run')
    return
  }

  try {
    await testConfigs(baseURL, createHttpClient(baseURL), configs, typeValidator)
  } catch (err) {
    return handleError(err)
  }
}
