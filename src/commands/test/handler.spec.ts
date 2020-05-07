import { mockFn, randomString, mocked, mockObj } from '~test-helpers'
import { HandleError, CreateTypeValidator } from '~commands/shared'
import { createHandler, TestArgs } from './handler'
import { resolve } from 'path'
import { existsSync } from 'fs'
import readConfig, { Config } from '~config-old'
import { TypeValidator } from '~validation'
import { Mode } from '~config-old/types'
import { NCDCLogger } from '~logger'
import { TestConfigs } from './test'

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
const mockedTestConfigs = mockFn<TestConfigs>()
const handler = createHandler(mockedHandleError, mockedCreateTypeValidator, mockedLogger, mockedTestConfigs)

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

  it('returns an error if the tsconfig path does not exist', async () => {
    const args: TestArgs = {
      force: false,
      tsconfigPath: randomString('tsconfig-path'),
      configPath: randomString(),
      baseURL: randomString(),
    }
    mockedExistsSync.mockReturnValue(false)

    await handler(args)

    expect(mockedResolve).toBeCalledWith(args.tsconfigPath)
    expect(mockedHandleError).toBeCalledWith({ message: `${resolvedTsconfigPath} does not exist` })
  })
})

const args: TestArgs = {
  force: false,
  tsconfigPath: randomString('tsconfig-path'),
  configPath: randomString('config-path'),
  baseURL: randomString('baseURL'),
  schemaPath: randomString('schema-path'),
}

const mockedReadConfig = mocked(readConfig)

it('calls createTypeValidator with the correct arguments', async () => {
  mockedReadConfig.mockResolvedValue([])

  await handler(args)

  expect(mockedCreateTypeValidator).toBeCalledWith(args.tsconfigPath, args.force, args.schemaPath)
})

it('calls readConfig with the correct arguments', async () => {
  mockedReadConfig.mockResolvedValue([])

  await handler(args)

  // TODO: deprecate the mode stuff
  expect(mockedReadConfig).toBeCalledWith(args.configPath, mockedTypeValidator, Mode.Test)
})

it('handles errors reading the config', async () => {
  mockedReadConfig.mockRejectedValue(new Error('oh no'))

  await handler(args)

  expect(mockedHandleError).toBeCalledWith(expect.objectContaining({ message: 'oh no' }))
})

it('logs a message if there are no configs to run', async () => {
  mockedReadConfig.mockResolvedValue([])

  await handler(args)

  expect(mockedLogger.warn).toBeCalledWith('No tests to run')
})

it('calls testConfigs with the correct arguments', async () => {
  const configs: Config[] = [mockObj<Config>({ name: randomString('name') })]
  mockedReadConfig.mockResolvedValue(configs)

  await handler(args)

  expect(mockedHandleError).not.toBeCalled()
  expect(mockedTestConfigs).toBeCalledWith(
    args.baseURL,
    expect.objectContaining({}),
    configs,
    mockedTypeValidator,
  )
})

it('handles errors thrown by testConfigs', async () => {
  const configs: Config[] = [mockObj<Config>({ name: randomString('name') })]
  mockedReadConfig.mockResolvedValue(configs)
  mockedTestConfigs.mockRejectedValue(new Error('oops'))

  await handler(args)

  expect(mockedHandleError).toBeCalledWith(expect.objectContaining({ message: 'oops' }))
})

// TODO: desired behaviour
it.todo('creates a type validator if there are types in the config')

it.todo('does not create a type validator if there are no types in the config')
