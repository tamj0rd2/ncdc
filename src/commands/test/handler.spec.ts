import { mockFn, randomString, mockObj, randomNumber } from '~test-helpers'
import {
  createHandler,
  TestArgs,
  GetTestDeps,
  GetTypeValidator,
  RunTests,
  ConfigLoader,
  TestDeps,
} from './handler'
import { NcdcLogger } from '~logger'
import { ResourceBuilder } from '~config'
import {
  InvalidBodyTypeError,
  ServiceConfigInvalidError,
  ServiceConfigReadError,
  NoServiceResourcesError,
} from '~config/errors'

jest.disableAutomock()

describe('test handler', () => {
  function createTestDeps() {
    const mockGetTypeValidator = mockFn<GetTypeValidator>()
    const mockLogger = mockObj<NcdcLogger>({ warn: jest.fn() })
    const mockRunTests = mockFn<RunTests>()
    const mockConfigLoader = mockObj<ConfigLoader>({ load: jest.fn() })
    const mockGetTestDeps = mockFn<GetTestDeps>()
    const dummyTestDeps: TestDeps = {
      configLoader: mockConfigLoader,
      getTypeValidator: mockGetTypeValidator,
      logger: mockLogger,
      runTests: mockRunTests,
    }

    return {
      mockGetTypeValidator,
      mockLogger,
      mockRunTests,
      mockConfigLoader,
      mockGetTestDeps,
      dummyTestDeps,
      handler: createHandler(mockGetTestDeps),
    }
  }

  afterEach(() => jest.resetAllMocks())

  describe('cli arg validation', () => {
    it('throws if a configPath is not given', async () => {
      const { handler, mockGetTestDeps, dummyTestDeps } = createTestDeps()
      mockGetTestDeps.mockReturnValue(dummyTestDeps)
      const args: TestArgs = {
        force: false,
        tsconfigPath: randomString(),
        verbose: false,
        timeout: randomNumber(),
      }

      await expect(handler(args)).rejects.toThrowError('configPath must be specified')
    })

    it('throws if a baseURL is not given', async () => {
      const { handler, mockGetTestDeps, dummyTestDeps } = createTestDeps()
      mockGetTestDeps.mockReturnValue(dummyTestDeps)
      const args: TestArgs = {
        force: false,
        tsconfigPath: randomString(),
        configPath: randomString(),
        verbose: false,
        timeout: randomNumber(),
      }

      await expect(handler(args)).rejects.toThrowError('baseURL must be specified')
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
    const { handler, mockGetTestDeps, mockConfigLoader, dummyTestDeps } = createTestDeps()
    mockGetTestDeps.mockReturnValue(dummyTestDeps)
    mockConfigLoader.load.mockResolvedValue({ fixturePaths: [], configs: [] })

    await handler(args)

    expect(mockConfigLoader.load).toBeCalledWith(args.configPath)
  })

  const badStatuses = [
    new InvalidBodyTypeError('file path', 'message'),
    new ServiceConfigInvalidError('file path', ['error1']),
    new ServiceConfigReadError('file path', 'message'),
  ] as const
  it.each(badStatuses.map((x) => [x]))(
    `throws an error when there is a %o response from loadConfig`,
    async (error) => {
      const { handler, mockGetTestDeps, mockConfigLoader, dummyTestDeps } = createTestDeps()
      mockGetTestDeps.mockReturnValue(dummyTestDeps)
      mockConfigLoader.load.mockRejectedValue(error)

      await expect(handler(args)).rejects.toThrowError(error.message)
    },
  )

  it('throws when there are no configs to run tests for', async () => {
    const { handler, mockGetTestDeps, mockConfigLoader, dummyTestDeps } = createTestDeps()
    mockGetTestDeps.mockReturnValue(dummyTestDeps)
    mockConfigLoader.load.mockRejectedValue(new NoServiceResourcesError('file path'))

    await expect(handler(args)).rejects.toThrowColouredError('No configs to test')
  })

  it('calls runTests with the correct arguments', async () => {
    const { handler, mockGetTestDeps, mockConfigLoader, mockRunTests, dummyTestDeps } = createTestDeps()
    mockGetTestDeps.mockReturnValue(dummyTestDeps)
    const configs = [new ResourceBuilder().build()]
    mockConfigLoader.load.mockResolvedValue({ configs, fixturePaths: [] })

    await handler(args)

    expect(mockRunTests).toBeCalledWith(args.baseURL, configs, expect.any(Function))
  })

  it('handles errors thrown by testConfigs', async () => {
    const { handler, mockGetTestDeps, mockConfigLoader, mockRunTests, dummyTestDeps } = createTestDeps()
    mockGetTestDeps.mockReturnValue(dummyTestDeps)
    mockConfigLoader.load.mockResolvedValue({ fixturePaths: [], configs: [new ResourceBuilder().build()] })
    mockRunTests.mockResolvedValue('Failure')

    await expect(handler(args)).rejects.toThrowError('Not all tests passed')
  })
})
