import createHandler, { CreateServer, ServeArgs, GetTypeValidator, GetServeDeps } from './handler'
import { mockFn, randomString, mockObj, mocked, randomNumber } from '~test-helpers'
import { HandleError } from '~commands/shared'
import { transformResources, ValidatedServeConfig } from './config'
import stripAnsi from 'strip-ansi'
import { LoadConfig } from '~config/load'
import { ResourceBuilder } from '~config'
import { NcdcLogger } from '~logger'
import { resolve } from 'path'
import { NoServiceResourcesError } from '~config/errors'

jest.disableAutomock()
jest.mock('path')
jest.mock('chokidar')
jest.mock('./config')

describe('serve handler', () => {
  function createTestDeps() {
    const mockHandleError = mockFn<HandleError>()
    const mockGetTypeValidator = mockFn<GetTypeValidator>()
    const mockLoadConfig = mockFn<LoadConfig<ValidatedServeConfig>>()
    const mockLogger = mockObj<NcdcLogger>({})
    const mockGetServeDeps = mockFn<GetServeDeps>()
    const mockTransformConfigs = mocked(transformResources)
    const mockCreateServer = mockFn<CreateServer>()
    const mockResolve = mockFn(resolve)

    return {
      mockHandleError,
      mockGetTypeValidator,
      mockLoadConfig,
      mockLogger,
      mockGetServeDeps,
      mockTransformConfigs,
      mockCreateServer,
      mockResolve,
      handler: createHandler(mockGetServeDeps),
    }
  }

  afterEach(() => jest.resetAllMocks())

  it('handles when a config path is not supplied', async () => {
    const {
      handler,
      mockCreateServer,
      mockGetServeDeps,
      mockGetTypeValidator,
      mockHandleError,
      mockLoadConfig,
      mockLogger,
    } = createTestDeps()
    mockGetServeDeps.mockReturnValueOnce({
      createServer: mockCreateServer,
      getTypeValidator: mockGetTypeValidator,
      handleError: mockHandleError,
      loadConfig: mockLoadConfig,
      logger: mockLogger,
    })

    await handler({ force: false, port: 8001, tsconfigPath: randomString(), watch: false, verbose: false })

    expect(mockHandleError).toBeCalledWith({ message: 'config path must be supplied' })
  })

  it('handles when port is not a number', async () => {
    const {
      handler,
      mockCreateServer,
      mockGetServeDeps,
      mockGetTypeValidator,
      mockHandleError,
      mockLoadConfig,
      mockLogger,
    } = createTestDeps()
    mockGetServeDeps.mockReturnValueOnce({
      createServer: mockCreateServer,
      getTypeValidator: mockGetTypeValidator,
      handleError: mockHandleError,
      loadConfig: mockLoadConfig,
      logger: mockLogger,
    })

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
    const {
      handler,
      mockCreateServer,
      mockGetServeDeps,
      mockGetTypeValidator,
      mockHandleError,
      mockLoadConfig,
      mockLogger,
    } = createTestDeps()
    mockGetServeDeps.mockReturnValueOnce({
      createServer: mockCreateServer,
      getTypeValidator: mockGetTypeValidator,
      handleError: mockHandleError,
      loadConfig: mockLoadConfig,
      logger: mockLogger,
    })

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
      const {
        handler,
        mockCreateServer,
        mockGetServeDeps,
        mockGetTypeValidator,
        mockHandleError,
        mockLoadConfig,
        mockLogger,
        mockResolve,
        mockTransformConfigs,
      } = createTestDeps()

      const expectedConfigPath = randomString('lol') + args.configPath
      mockResolve.mockReturnValue(expectedConfigPath)
      mockGetServeDeps.mockReturnValueOnce({
        createServer: mockCreateServer,
        getTypeValidator: mockGetTypeValidator,
        handleError: mockHandleError,
        loadConfig: mockLoadConfig,
        logger: mockLogger,
      })

      await handler(args)

      expect(mockLoadConfig).toBeCalledWith(
        expectedConfigPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        false,
      )
    })

    // this is because if we're loading from disk, we want to create a new
    // validator each time the schema files change. It's a lot less expensive
    // than generating schemas - it's basically instant.
    it('creates a new type validator every time if schemaPath is defined', async () => {
      const {
        handler,
        mockCreateServer,
        mockGetServeDeps,
        mockGetTypeValidator,
        mockHandleError,
        mockLoadConfig,
        mockLogger,
      } = createTestDeps()
      mockGetServeDeps.mockReturnValueOnce({
        createServer: mockCreateServer,
        getTypeValidator: mockGetTypeValidator,
        handleError: mockHandleError,
        loadConfig: mockLoadConfig,
        logger: mockLogger,
      })

      await handler({ ...args, schemaPath: randomString('schemaPath') })

      const getTypeValidatorFn = mockLoadConfig.mock.calls[0][1]
      const timesToCall = randomNumber(1, 10)
      await Array(timesToCall)
        .fill(0)
        .reduce<Promise<unknown>>((prev) => prev.then(getTypeValidatorFn), Promise.resolve())

      expect(mockGetTypeValidator).toBeCalledTimes(timesToCall)
    })

    it('handles there being no configs to serve as an error', async () => {
      const {
        handler,
        mockCreateServer,
        mockGetServeDeps,
        mockGetTypeValidator,
        mockHandleError,
        mockLoadConfig,
        mockLogger,
      } = createTestDeps()
      mockGetServeDeps.mockReturnValueOnce({
        createServer: mockCreateServer,
        getTypeValidator: mockGetTypeValidator,
        handleError: mockHandleError,
        loadConfig: mockLoadConfig,
        logger: mockLogger,
      })

      mockLoadConfig.mockRejectedValue(new NoServiceResourcesError('file path'))

      await handler(args)

      expect(mockHandleError).toBeCalled()
      expect(stripAnsi(mockHandleError.mock.calls[0][0].message)).toEqual('No configs to serve')
    })

    it('creates the server with the correct args', async () => {
      const {
        handler,
        mockCreateServer,
        mockGetServeDeps,
        mockGetTypeValidator,
        mockHandleError,
        mockLoadConfig,
        mockLogger,
      } = createTestDeps()
      mockGetServeDeps.mockReturnValueOnce({
        createServer: mockCreateServer,
        getTypeValidator: mockGetTypeValidator,
        handleError: mockHandleError,
        loadConfig: mockLoadConfig,
        logger: mockLogger,
      })
      mockCreateServer.mockReturnValue({ start: jest.fn(), stop: jest.fn() })

      const configs = [new ResourceBuilder().build()]
      mockLoadConfig.mockImplementation(async (_, getTypeValidator) => {
        await getTypeValidator()
        return { configs, absoluteFixturePaths: [] }
      })

      await handler(args)

      expect(mockHandleError).not.toBeCalled()
      expect(mockCreateServer).toBeCalledTimes(1)
      expect(mockCreateServer).toBeCalledWith(args.port)
    })

    it.todo('starts the server with the correct args')
  })
})
