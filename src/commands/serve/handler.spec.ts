import createHandler, { StartServer, ServeArgs, CreateTypeValidator, GetServeDeps } from './handler'
import { mockFn, randomString, mockObj, mocked, randomNumber } from '~test-helpers'
import { HandleError } from '~commands/shared'
import { transformConfigs, ValidatedServeConfig } from './config'
import chokidar, { FSWatcher } from 'chokidar'
import stripAnsi from 'strip-ansi'
import { LoadConfig, LoadConfigStatus } from '~config/load'
import { TypeValidator } from '~validation'
import { ConfigBuilder } from '~config/types'
import { NcdcLogger } from '~logger'
import { resolve } from 'path'

jest.unmock('./handler')
jest.unmock('@hapi/joi')
jest.mock('path')

const mockHandleError = mockFn<HandleError>()
const mockCreateTypeValidator = mockFn<CreateTypeValidator>()
const mockLoadConfig = mockFn<LoadConfig<ValidatedServeConfig>>()
const mockLogger = mockObj<NcdcLogger>({})
const getServeDeps = mockFn<GetServeDeps>()
const mockTransformConfigs = mocked(transformConfigs)
const mockTypeValidator = mockObj<TypeValidator>({ validate: jest.fn() })
const mockStartServer = mockFn<StartServer>()
const mockResolve = mockFn(resolve)

beforeEach(() => {
  jest.resetAllMocks()
  mockObj(chokidar).watch.mockReturnValue(
    mockObj<FSWatcher>({ on: jest.fn() }),
  )
  getServeDeps.mockReturnValue({
    createTypeValidator: mockCreateTypeValidator,
    handleError: mockHandleError,
    loadConfig: mockLoadConfig,
    logger: mockLogger,
    startServer: mockStartServer,
  })
  mockCreateTypeValidator.mockResolvedValue(mockTypeValidator)
  mockTransformConfigs.mockResolvedValue([
    {
      name: randomString('name'),
      request: { endpoint: randomString('endpoint'), method: 'GET' },
      response: { code: randomNumber() },
    },
  ])
})

const handler = createHandler(getServeDeps)

it('handles when a config path is not supplied', async () => {
  await handler({ force: false, port: 8001, tsconfigPath: randomString(), watch: false, verbose: false })

  expect(mockHandleError).toBeCalledWith({ message: 'config path must be supplied' })
})

it('handles when port is not a number', async () => {
  await handler({
    force: false,
    port: NaN,
    tsconfigPath: randomString(),
    configPath: randomString(),
    watch: false,
    verbose: false,
  })

  expect(mockHandleError).toBeCalledWith({ message: 'port must be a number' })
})

it('handles when force and watch are used at the same time', async () => {
  await handler({
    force: true,
    port: randomNumber(),
    tsconfigPath: randomString(),
    configPath: randomString(),
    watch: true,
    verbose: false,
  })

  expect(mockHandleError).toBeCalledWith({ message: 'watch and force options cannot be used together' })
})

describe('runs the server with the correct configs', () => {
  const args: ServeArgs = {
    force: false,
    port: 4000,
    tsconfigPath: randomString(),
    configPath: randomString(),
    watch: false,
    verbose: false,
  }

  it('calls loadconfig with the correct args', async () => {
    const expectedConfigPath = randomString('lol') + args.configPath
    mockResolve.mockReturnValue(expectedConfigPath)

    await handler(args)

    expect(mockLoadConfig).toBeCalledWith(
      expectedConfigPath,
      expect.any(Function),
      mockTransformConfigs,
      false,
    )
  })

  it('only creates a type validator once if schemaPath is not defined', async () => {
    await handler(args)

    const getTypeValidatorFn = mockLoadConfig.mock.calls[0][1]
    const timesToCall = randomNumber(1, 10)
    await Array(timesToCall)
      .fill(undefined)
      .reduce(async (prev) => {
        await prev
        return getTypeValidatorFn()
      }, Promise.resolve())

    expect(mockCreateTypeValidator).toBeCalledTimes(1)
  })

  // this is because if we're loading from disk, we want to create a new
  // validator each time the schema files change. It's a lot less expensive
  // than generating schemas - it's basically instant.
  it('creates a new type validator every time if schemaPath is defined', async () => {
    await handler({ ...args, schemaPath: randomString('schemaPath') })

    const getTypeValidatorFn = mockLoadConfig.mock.calls[0][1]
    const timesToCall = randomNumber(1, 10)
    await Array(timesToCall)
      .fill(0)
      .reduce<Promise<unknown>>((prev) => prev.then(getTypeValidatorFn), Promise.resolve())

    expect(mockCreateTypeValidator).toBeCalledTimes(timesToCall)
  })

  const failureStatuses = [
    LoadConfigStatus.InvalidBodies,
    LoadConfigStatus.InvalidConfig,
    LoadConfigStatus.ProblemReadingConfig,
  ] as const

  failureStatuses.forEach((status) => {
    it(`handles the load config status ${status} as an error`, async () => {
      const failureMessage = randomString('whoops')
      mockLoadConfig.mockResolvedValue({ type: status, message: failureMessage })

      await handler(args)

      expect(mockHandleError).toBeCalledWith(expect.objectContaining({ message: failureMessage }))
    })
  })

  it('handles there being no configs to serve as an error', async () => {
    mockLoadConfig.mockResolvedValue({ type: LoadConfigStatus.NoConfigs })

    await handler(args)

    expect(mockHandleError).toBeCalled()
    expect(stripAnsi(mockHandleError.mock.calls[0][0].message)).toEqual('No configs to serve')
  })

  it('runs the server with the correct args', async () => {
    const configs = [new ConfigBuilder().build()]
    mockLoadConfig.mockImplementation(async (_, getTypeValidator) => {
      await getTypeValidator()
      return { type: LoadConfigStatus.Success, configs, absoluteFixturePaths: [] }
    })

    await handler(args)

    expect(mockHandleError).not.toBeCalled()
    expect(mockStartServer).toBeCalledTimes(1)
    expect(mockStartServer).toBeCalledWith(configs, mockTypeValidator)
  })
})
