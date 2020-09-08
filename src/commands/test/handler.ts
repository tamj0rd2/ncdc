import { red } from 'chalk'
import { TypeValidator } from '~validation'
import { HandleError } from '~commands/shared'
import { NcdcLogger } from '~logger'
import { Resource } from '~config'
import { NoServiceResourcesError } from '~config/errors'
import { LoadConfigResponse } from '~config/load'

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

export interface ConfigLoader {
  load(configPath: string): Promise<LoadConfigResponse>
}

export interface TestDeps {
  handleError: HandleError
  logger: NcdcLogger
  getTypeValidator(): Promise<TypeValidator>
  runTests: RunTests
  configLoader: ConfigLoader
}

export type GetTypeValidator = () => Promise<TypeValidator>

export const createHandler = (getTestDeps: GetTestDeps) => async (args: TestArgs): Promise<void> => {
  const { handleError, getTypeValidator, configLoader, runTests } = getTestDeps(args)
  if (!args.configPath) return handleError({ message: `configPath must be specified` })
  if (!args.baseURL) return handleError({ message: 'baseURL must be specified' })

  try {
    const loadResult = await configLoader.load(args.configPath)
    const testResult = await runTests(args.baseURL, loadResult.configs, getTypeValidator)
    if (testResult === 'Failure') return handleError({ message: 'Not all tests passed' })
  } catch (err) {
    return handleError({
      message: err instanceof NoServiceResourcesError ? red('No configs to test') : err.message,
    })
  }
}
