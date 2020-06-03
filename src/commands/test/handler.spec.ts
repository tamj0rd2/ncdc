import { mockFn, randomString, mocked, mockObj, randomNumber } from '~test-helpers'
import { HandleError, CreateTypeValidator } from '~commands/shared'
import { createHandler, TestArgs } from './handler'
import { resolve } from 'path'
import { existsSync } from 'fs'
import { TypeValidator } from '~validation'
import { NCDCLogger } from '~logger'
import { RunTests } from './test'
import { LoadConfig, LoadConfigStatus } from '~config/load'
import { ValidatedTestConfig, transformConfigs } from './config'
import { ConfigBuilder } from '~config/types'

jest.unmock('./handler')
jest.mock('fs')
jest.mock('path')

const mockedHandleError = mockFn<HandleError>()
const mockedTypeValidator = mockObj<TypeValidator>({})
const mockedCreateTypeValidator = mockFn<CreateTypeValidator>()
const mockedExistsSync = mocked(existsSync)
const mockedResolve = mocked(resolve)
const resolvedTsconfigPath = randomString('resolved-tsconfig')
const mockedLogger = mockObj<NCDCLogger>({ warn: jest.fn() })
const mockedRunTests = mockFn<RunTests>()
const mockedLoadConfig = mockFn<LoadConfig<ValidatedTestConfig>>()
const handler = createHandler(
  mockedHandleError,
  mockedCreateTypeValidator,
  mockedLogger,
  mockedRunTests,
  mockedLoadConfig,
)

beforeEach(() => {
  jest.resetAllMocks()
  mockedExistsSync.mockReturnValue(true)
  mockedResolve.mockReturnValue(resolvedTsconfigPath)
  mockedCreateTypeValidator.mockReturnValue(mockedTypeValidator)
})

describe('cli arg validation', () => {
  it('returns an error if a configPath is not given', async () => {
    const args: TestArgs = { force: false, tsconfigPath: randomString() }

    await handler(args)

    expect(mockedHandleError).toBeCalledWith({ message: 'configPath must be specified' })
  })

  it('returns an error if a baseURL is not given', async () => {
    const args: TestArgs = { force: false, tsconfigPath: randomString(), configPath: randomString() }

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

it('only creates a type validator once for loading configs', async () => {
  mockedLoadConfig.mockResolvedValue({ type: LoadConfigStatus.NoConfigs })
  await handler(args)

  const getTypeValidatorFn = mockedLoadConfig.mock.calls[0][1]
  const timesToCall = randomNumber(1, 10)
  for (let i = 0; i < timesToCall; i++) {
    getTypeValidatorFn()
  }
  expect(mockedCreateTypeValidator).toBeCalledTimes(1)
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
  expect(mockedRunTests).toBeCalledWith(
    args.baseURL,
    expect.objectContaining({}),
    configs,
    expect.any(Function),
    mockedLogger,
  )
})

it('only creates a type validator once for running the tests', async () => {
  const configs = [new ConfigBuilder().build()]
  mockedLoadConfig.mockResolvedValue({ type: LoadConfigStatus.Success, configs, absoluteFixturePaths: [] })

  await handler(args)

  const getTypeValidatorFn = mockedRunTests.mock.calls[0][3]
  const timesToCall = randomNumber(1, 10)
  for (let i = 0; i < timesToCall; i++) {
    getTypeValidatorFn()
  }
  expect(mockedCreateTypeValidator).toBeCalledTimes(1)
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
