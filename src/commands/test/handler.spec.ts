import { mockFn, randomString, mockObj, randomNumber } from '~test-helpers'
import { HandleError } from '~commands/shared'
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
    const mockHandleError = mockFn<HandleError>()
    const mockGetTypeValidator = mockFn<GetTypeValidator>()
    const mockLogger = mockObj<NcdcLogger>({ warn: jest.fn() })
    const mockRunTests = mockFn<RunTests>()
    const mockConfigLoader = mockObj<ConfigLoader>({ load: jest.fn() })
    const mockGetTestDeps = mockFn<GetTestDeps>()
    const dummyTestDeps: TestDeps = {
      configLoader: mockConfigLoader,
      getTypeValidator: mockGetTypeValidator,
      handleError: mockHandleError,
      logger: mockLogger,
      runTests: mockRunTests,
    }

    return {
      mockHandleError,
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
    it('returns an error if a configPath is not given', async () => {
      const { handler, mockGetTestDeps, mockHandleError, dummyTestDeps } = createTestDeps()
      mockGetTestDeps.mockReturnValue(dummyTestDeps)

      await handler({
        force: false,
        tsconfigPath: randomString(),
        verbose: false,
        timeout: randomNumber(),
      })

      expect(mockHandleError).toBeCalledWith({ message: 'configPath must be specified' })
    })

    it('returns an error if a baseURL is not given', async () => {
      const { handler, mockGetTestDeps, mockHandleError, dummyTestDeps } = createTestDeps()
      mockGetTestDeps.mockReturnValue(dummyTestDeps)

      await handler({
        force: false,
        tsconfigPath: randomString(),
        configPath: randomString(),
        verbose: false,
        timeout: randomNumber(),
      })

      expect(mockHandleError).toBeCalledWith({ message: 'baseURL must be specified' })
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
  it.each(badStatuses.map((x) => [x]))(`handles a %o response from loadConfig`, async (error) => {
    const { handler, mockGetTestDeps, mockHandleError, mockConfigLoader, dummyTestDeps } = createTestDeps()
    mockGetTestDeps.mockReturnValue(dummyTestDeps)
    mockConfigLoader.load.mockRejectedValue(error)

    await handler(args)

    expect(mockHandleError).toBeCalledWith(expect.objectContaining({ message: error.message }))
  })

  it('handles there being no configs to run as an error', async () => {
    const { handler, mockGetTestDeps, mockHandleError, mockConfigLoader, dummyTestDeps } = createTestDeps()
    mockGetTestDeps.mockReturnValue(dummyTestDeps)
    mockConfigLoader.load.mockRejectedValue(new NoServiceResourcesError('file path'))

    await handler(args)

    expect(mockHandleError).toBeCalledWith(
      expect.objectContaining({ message: expect.stringContaining('No configs to test') }),
    )
  })

  it('calls runTests with the correct arguments', async () => {
    const {
      handler,
      mockGetTestDeps,
      mockHandleError,
      mockConfigLoader,
      mockRunTests,
      dummyTestDeps,
    } = createTestDeps()
    mockGetTestDeps.mockReturnValue(dummyTestDeps)
    const configs = [new ResourceBuilder().build()]
    mockConfigLoader.load.mockResolvedValue({ configs, fixturePaths: [] })

    await handler(args)

    expect(mockHandleError).not.toBeCalled()
    expect(mockRunTests).toBeCalledWith(args.baseURL, configs, expect.any(Function))
  })

  it('handles errors thrown by testConfigs', async () => {
    const {
      handler,
      mockGetTestDeps,
      mockHandleError,
      mockConfigLoader,
      mockRunTests,
      dummyTestDeps,
    } = createTestDeps()
    mockGetTestDeps.mockReturnValue(dummyTestDeps)
    mockConfigLoader.load.mockResolvedValue({ fixturePaths: [], configs: [new ResourceBuilder().build()] })
    mockRunTests.mockResolvedValue('Failure')

    await handler(args)

    expect(mockHandleError).toBeCalledWith(expect.objectContaining({ message: 'Not all tests passed' }))
  })
})
