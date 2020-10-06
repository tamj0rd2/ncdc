import createHandler, {
  CreateServer,
  ServeArgs,
  GetTypeValidator,
  GetServeDeps,
  ConfigLoader,
  ServeDeps,
} from './handler'
import { mockFn, randomString, mockObj, mocked, randomNumber } from '~test-helpers'
import { transformResources } from './config'
import { ResourceBuilder } from '~config'
import { NcdcLogger } from '~logger'
import { NoServiceResourcesError } from '~config/errors'
import NcdcServer from './server/ncdc-server'

jest.disableAutomock()
jest.mock('path')
jest.mock('chokidar')
jest.mock('./config')

describe('serve handler', () => {
  function createTestDeps() {
    const mockGetTypeValidator = mockFn<GetTypeValidator>()
    const mockConfigLoader = mockObj<ConfigLoader>({ load: jest.fn() })
    const mockLogger = mockObj<NcdcLogger>({})
    const mockGetServeDeps = mockFn<GetServeDeps>()
    const mockTransformConfigs = mocked(transformResources)
    const mockCreateServer = mockFn<CreateServer>()
    const dummyServeDeps: ServeDeps = {
      configLoader: mockConfigLoader,
      createServer: mockCreateServer,
      logger: mockLogger,
    }

    return {
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

  it('throws when a config path is not supplied', async () => {
    const { handler, mockGetServeDeps, dummyServeDeps } = createTestDeps()
    mockGetServeDeps.mockReturnValueOnce(dummyServeDeps)
    const args: ServeArgs = {
      force: false,
      port: 8001,
      tsconfigPath: randomString(),
      watch: false,
      verbose: false,
    }

    await expect(handler(args)).rejects.toThrowError('config path must be supplied')
  })

  it('throws when port is not a number', async () => {
    const { handler, mockGetServeDeps, dummyServeDeps } = createTestDeps()
    mockGetServeDeps.mockReturnValueOnce(dummyServeDeps)
    const args: ServeArgs = {
      force: false,
      port: NaN,
      tsconfigPath: randomString(),
      configPath: randomString(),
      watch: false,
      verbose: false,
    }

    await expect(handler(args)).rejects.toThrow('port must be a number')
  })

  it('throws when force and watch are used at the same time', async () => {
    const { handler, mockGetServeDeps, dummyServeDeps } = createTestDeps()
    mockGetServeDeps.mockReturnValueOnce(dummyServeDeps)
    const args: ServeArgs = {
      force: true,
      port: randomNumber(),
      tsconfigPath: randomString(),
      configPath: randomString(),
      watch: true,
      verbose: false,
    }

    await expect(handler(args)).rejects.toThrowError('watch and force options cannot be used together')
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
      const {
        handler,
        mockGetServeDeps,
        dummyServeDeps,
        mockConfigLoader,
        mockCreateServer,
      } = createTestDeps()
      mockGetServeDeps.mockReturnValueOnce(dummyServeDeps)
      mockCreateServer.mockReturnValue(
        mockObj<NcdcServer>({ start: jest.fn() }),
      )
      mockConfigLoader.load.mockResolvedValue({ configs: [], fixturePaths: [] })

      await handler(args)

      expect(mockConfigLoader.load).toBeCalledWith(args.configPath)
    })

    it('throws when there are no configs to serve', async () => {
      const {
        handler,
        mockGetServeDeps,

        mockConfigLoader,
        dummyServeDeps,
      } = createTestDeps()
      mockGetServeDeps.mockReturnValueOnce(dummyServeDeps)
      mockConfigLoader.load.mockRejectedValue(new NoServiceResourcesError('file path'))

      await expect(handler(args)).rejects.toThrowColouredError('No configs to serve')
    })

    it('creates the server with the correct args', async () => {
      const {
        handler,
        mockCreateServer,
        mockGetServeDeps,
        mockConfigLoader,
        dummyServeDeps,
      } = createTestDeps()
      mockGetServeDeps.mockReturnValueOnce(dummyServeDeps)
      mockCreateServer.mockReturnValue({ start: jest.fn(), stop: jest.fn() })

      const configs = [new ResourceBuilder().build()]
      mockConfigLoader.load.mockResolvedValue({ configs, fixturePaths: [] })

      await handler(args)

      expect(mockCreateServer).toBeCalledTimes(1)
      expect(mockCreateServer).toBeCalledWith(args.port)
    })

    it.todo('starts the server with the correct args')
  })
})
