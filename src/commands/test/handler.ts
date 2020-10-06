import { TypeValidator } from '~validation'
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
  logger: NcdcLogger
  getTypeValidator(): Promise<TypeValidator>
  runTests: RunTests
  configLoader: ConfigLoader
}

export type GetTypeValidator = () => Promise<TypeValidator>

export const createHandler = (getTestDeps: GetTestDeps) => async (args: TestArgs): Promise<void> => {
  const { getTypeValidator, configLoader, runTests } = getTestDeps(args)
  if (!args.configPath) throw new Error(`configPath must be specified`)
  if (!args.baseURL) throw new Error('baseURL must be specified')

  try {
    const loadResult = await configLoader.load(args.configPath)
    const testResult = await runTests(args.baseURL, loadResult.configs, getTypeValidator)
    if (testResult === 'Failure') throw new Error('Not all tests passed')
  } catch (err) {
    if (err instanceof NoServiceResourcesError) {
      throw new Error(err.formatCustomMessage('No configs to test'))
    }

    throw err
  }
}
