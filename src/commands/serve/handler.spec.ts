import createHandler, {
  CreateServer,
  ServeArgs,
  GetTypeValidator,
  GetServeDeps,
  ConfigLoader,
  ServeDeps,
} from './handler'
import { mockFn, randomString, mockObj, mocked, randomNumber } from '~test-helpers'
import { HandleError } from '~commands/shared'
import { transformResources } from './config'
import stripAnsi from 'strip-ansi'
import { ResourceBuilder } from '~config'
import { NcdcLogger } from '~logger'
import { NoServiceResourcesError } from '~config/errors'

jest.disableAutomock()
jest.mock('path')
jest.mock('chokidar')
jest.mock('./config')

describe('serve handler', () => {
  function createTestDeps() {
    const mockHandleError = mockFn<HandleError>()
    const mockGetTypeValidator = mockFn<GetTypeValidator>()
    const mockConfigLoader = mockObj<ConfigLoader>({ load: jest.fn() })
    const mockLogger = mockObj<NcdcLogger>({})
    const mockGetServeDeps = mockFn<GetServeDeps>()
    const mockTransformConfigs = mocked(transformResources)
    const mockCreateServer = mockFn<CreateServer>()
    const dummyServeDeps: ServeDeps = {
      configLoader: mockConfigLoader,
      createServer: mockCreateServer,
      handleError: mockHandleError,
      logger: mockLogger,
    }

    return {
      mockHandleError,
      mockGetTypeValidator,
      mockConfigLoader,
      mockLogger,
      mockGetServeDeps,
      mockTransformConfigs,
      mockCreateServer,
      dummyServeDeps,
      handler: createHandler(mockGetServeDeps),
    }
  }

  afterEach(() => jest.resetAllMocks())

  it('handles when a config path is not supplied', async () => {
    const { handler, mockGetServeDeps, mockHandleError, dummyServeDeps } = createTestDeps()
    mockGetServeDeps.mockReturnValueOnce(dummyServeDeps)

    await handler({ force: false, port: 8001, tsconfigPath: randomString(), watch: false, verbose: false })

    expect(mockHandleError).toBeCalledWith({ message: 'config path must be supplied' })
  })

  it('handles when port is not a number', async () => {
    const { handler, mockGetServeDeps, mockHandleError, dummyServeDeps } = createTestDeps()
    mockGetServeDeps.mockReturnValueOnce(dummyServeDeps)

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
    const { handler, mockGetServeDeps, mockHandleError, dummyServeDeps } = createTestDeps()
    mockGetServeDeps.mockReturnValueOnce(dummyServeDeps)

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
      tsconfigPath: randomString('tsconfigPath'),
      configPath: randomString('configPath'),
      watch: false,
      verbose: false,
    }

    it('calls loadconfig with the correct args', async () => {
      const { handler, mockGetServeDeps, dummyServeDeps, mockConfigLoader } = createTestDeps()
      mockGetServeDeps.mockReturnValueOnce(dummyServeDeps)

      await handler(args)

      expect(mockConfigLoader.load).toBeCalledWith(args.configPath)
    })

    it('handles there being no configs to serve as an error', async () => {
      const {
        handler,
        mockGetServeDeps,
        mockHandleError,
        mockConfigLoader,
        dummyServeDeps,
      } = createTestDeps()
      mockGetServeDeps.mockReturnValueOnce(dummyServeDeps)
      mockConfigLoader.load.mockRejectedValue(new NoServiceResourcesError('file path'))

      await handler(args)

      expect(mockHandleError).toBeCalled()
      expect(stripAnsi(mockHandleError.mock.calls[0][0].message)).toEqual('No configs to serve')
    })

    it('creates the server with the correct args', async () => {
      const {
        handler,
        mockCreateServer,
        mockGetServeDeps,
        mockHandleError,
        mockConfigLoader,
        dummyServeDeps,
      } = createTestDeps()
      mockGetServeDeps.mockReturnValueOnce(dummyServeDeps)
      mockCreateServer.mockReturnValue({ start: jest.fn(), stop: jest.fn() })

      const configs = [new ResourceBuilder().build()]
      mockConfigLoader.load.mockResolvedValue({ configs, fixturePaths: [] })

      await handler(args)

      expect(mockHandleError).not.toBeCalled()
      expect(mockCreateServer).toBeCalledTimes(1)
      expect(mockCreateServer).toBeCalledWith(args.port)
    })

    it.todo('starts the server with the correct args')
  })
})
