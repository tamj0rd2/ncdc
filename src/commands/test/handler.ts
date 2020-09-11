import { LoadConfig } from '~config/load'
import { ValidatedTestConfig, transformConfigs } from './config'
import { TypeValidator } from '~validation'
import { HandleError } from '~commands/shared'
import { NcdcLogger } from '~logger'
import { Resource } from '~config'
import { NoServiceResourcesError } from '~config/errors'

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

  try {
    const loadResult = await loadConfig(args.configPath, getTypeValidator, transformConfigs, true)
    const testResult = await runTests(args.baseURL, loadResult.configs, getTypeValidator)
    if (testResult === 'Failure') return handleError({ message: 'Not all tests passed' })
  } catch (err) {
    return handleError({
      message:
        err instanceof NoServiceResourcesError ? err.formatCustomMessage('No configs to test') : err.message,
    })
  }
}
