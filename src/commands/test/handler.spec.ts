import { mockFn, randomString, mocked, mockObj, randomNumber } from '~test-helpers'
import { HandleError } from '~commands/shared'
import { createHandler, TestArgs, GetTestDeps, GetTypeValidator, RunTests } from './handler'
import { resolve } from 'path'
import { existsSync } from 'fs'
import { TypeValidator } from '~validation'
import { NcdcLogger } from '~logger'
import { LoadConfig, LoadConfigStatus } from '~config/load'
import { ValidatedTestConfig, transformConfigs } from './config'
import { ConfigBuilder } from '~config/types'

jest.unmock('./handler')
jest.mock('fs')
jest.mock('path')

const mockedHandleError = mockFn<HandleError>()
const mockedTypeValidator = mockObj<TypeValidator>({})
const mockGetTypeValidator = mockFn<GetTypeValidator>()
const mockedExistsSync = mocked(existsSync)
const mockedResolve = mocked(resolve)
const resolvedTsconfigPath = randomString('resolved-tsconfig')
const mockedLogger = mockObj<NcdcLogger>({ warn: jest.fn() })
const mockedRunTests = mockFn<RunTests>()
const mockedLoadConfig = mockFn<LoadConfig<ValidatedTestConfig>>()
const getTestDeps = mockFn<GetTestDeps>()

beforeEach(() => {
  jest.resetAllMocks()
  mockedExistsSync.mockReturnValue(true)
  mockedResolve.mockReturnValue(resolvedTsconfigPath)
  mockGetTypeValidator.mockResolvedValue(mockedTypeValidator)
  getTestDeps.mockReturnValue({
    getTypeValidator: mockGetTypeValidator,
    handleError: mockedHandleError,
    loadConfig: mockedLoadConfig,
    logger: mockedLogger,
    runTests: mockedRunTests,
  })
})

const handler = createHandler(getTestDeps)

describe('cli arg validation', () => {
  it('returns an error if a configPath is not given', async () => {
    const args: TestArgs = {
      force: false,
      tsconfigPath: randomString(),
      verbose: false,
      timeout: randomNumber(),
    }

    await handler(args)

    expect(mockedHandleError).toBeCalledWith({ message: 'configPath must be specified' })
  })

  it('returns an error if a baseURL is not given', async () => {
    const args: TestArgs = {
      force: false,
      tsconfigPath: randomString(),
      configPath: randomString(),
      verbose: false,
      timeout: randomNumber(),
    }

    await handler(args)

    expect(mockedHandleError).toBeCalledWith({ message: 'baseURL must be specified' })
  })
})

const args: TestArgs = {
  force: false,
  tsconfigPath: randomString('tsconfig-path'),
  configPath: randomString('config-path'),
  baseURL: randomString('baseURL'),
  schemaPath: randomString('schema-path'),
  verbose: false,
  timeout: randomNumber(),
}

it('calls loadConfig with the correct args', async () => {
  mockedLoadConfig.mockResolvedValue({
    type: LoadConfigStatus.Success,
    absoluteFixturePaths: [],
    configs: [],
  })

  await handler(args)

  expect(mockedLoadConfig).toBeCalledWith(args.configPath, expect.any(Function), transformConfigs, true)
})

const badStatuses = [
  LoadConfigStatus.InvalidBodies,
  LoadConfigStatus.InvalidConfig,
  LoadConfigStatus.ProblemReadingConfig,
] as const
badStatuses.forEach((status) => {
  it(`handles a ${status} response from loadConfig`, async () => {
    const expectedMessage = randomString('message')
    mockedLoadConfig.mockResolvedValue({ type: status, message: expectedMessage })

    await handler(args)

    expect(mockedHandleError).toBeCalledWith(expect.objectContaining({ message: expectedMessage }))
  })
})

it('handles there being no configs to run as an error', async () => {
  mockedLoadConfig.mockResolvedValue({ type: LoadConfigStatus.NoConfigs })

  await handler(args)

  expect(mockedHandleError).toBeCalledWith(
    expect.objectContaining({ message: expect.stringContaining('No configs to test') }),
  )
})

it('calls runTests with the correct arguments', async () => {
  const configs = [new ConfigBuilder().build()]
  mockedLoadConfig.mockResolvedValue({ type: LoadConfigStatus.Success, configs, absoluteFixturePaths: [] })

  await handler(args)

  expect(mockedHandleError).not.toBeCalled()
  expect(mockedRunTests).toBeCalledWith(args.baseURL, configs, expect.any(Function))
})

it('handles errors thrown by testConfigs', async () => {
  mockedLoadConfig.mockResolvedValue({
    type: LoadConfigStatus.Success,
    absoluteFixturePaths: [],
    configs: [new ConfigBuilder().build()],
  })
  mockedRunTests.mockResolvedValue('Failure')

  await handler(args)

  expect(mockedHandleError).toBeCalledWith(expect.objectContaining({ message: 'Not all tests passed' }))
})
