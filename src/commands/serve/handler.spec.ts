import createHandler, { StartServer, ServeArgs } from './handler'
import { mockFn, randomString, mockObj, mocked, randomNumber } from '~test-helpers'
import { HandleError, CreateTypeValidator } from '~commands/shared'
import { transformConfigs, ServeConfig, ValidatedServeConfig } from './config'
import chokidar, { FSWatcher } from 'chokidar'
import stripAnsi from 'strip-ansi'
import { LoadConfig, LoadConfigStatus } from '~config/load'
import { TypeValidator } from '~validation'
import { ConfigBuilder } from '~config/types'

jest.unmock('./handler')
jest.unmock('@hapi/joi')
jest.mock('path')

describe('handler', () => {
  jest.spyOn(console, 'error').mockImplementation()
  const mockHandleError = mockFn<HandleError>()
  const mockCreateTypeValidator = mockFn<CreateTypeValidator>()
  const mockStartServer = mockFn<StartServer>()
  const mockChokidar = mockObj(chokidar)
  const mockLoadConfig = mockFn<LoadConfig<ValidatedServeConfig>>()

  const handler = createHandler(mockHandleError, mockCreateTypeValidator, mockStartServer, mockLoadConfig)

  beforeEach(() => {
    jest.resetAllMocks()
    mockChokidar.watch.mockReturnValue(
      mockObj<FSWatcher>({ on: jest.fn() }),
    )
  })

  it('handles when a config path is not supplied', async () => {
    await handler({ force: false, port: 8001, tsconfigPath: randomString(), watch: false })

    expect(mockHandleError).toBeCalledWith({ message: 'config path must be supplied' })
  })

  it('handles when port is not a number', async () => {
    await handler({
      force: false,
      port: NaN,
      tsconfigPath: randomString(),
      configPath: randomString(),
      watch: false,
    })

    expect(mockHandleError).toBeCalledWith({ message: 'port must be a number' })
  })

  const args: ServeArgs = {
    force: false,
    port: 4000,
    tsconfigPath: randomString(),
    configPath: randomString(),
    watch: false,
  }

  describe('runs the server with the correct configs', () => {
    const mockTransformConfigs = mocked(transformConfigs)
    const mockTypeValidator = mockObj<TypeValidator>({})

    beforeEach(() => {
      jest.resetAllMocks()
      mockCreateTypeValidator.mockReturnValue(mockTypeValidator)
      mockTransformConfigs.mockResolvedValue([
        { name: randomString('name'), request: {}, response: {} } as ServeConfig,
      ])
    })

    it('calls loadconfig with the correct args', async () => {
      await handler(args)

      expect(mockLoadConfig).toBeCalledWith(args.configPath, expect.any(Function), mockTransformConfigs)
    })

    it('only creates a type validator once if schemaPath is not defined', async () => {
      await handler(args)

      const getTypeValidatorFn = mockLoadConfig.mock.calls[0][1]
      const timesToCall = randomNumber(1, 10)
      for (let i = 0; i < timesToCall; i++) {
        getTypeValidatorFn()
      }
      expect(mockCreateTypeValidator).toBeCalledTimes(1)
    })

    // this is because if we're loading from disk, we want to create a new
    // validator each time the schema files change. It's a lot less expensive
    // than generating schemas - it's basically instant.
    it('creates a new type validator every time if schemaPath is defined', async () => {
      await handler({ ...args, schemaPath: randomString('schemaPath') })

      const getTypeValidatorFn = mockLoadConfig.mock.calls[0][1]
      const timesToCall = randomNumber(1, 10)
      for (let i = 0; i < timesToCall; i++) {
        getTypeValidatorFn()
      }
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
      mockLoadConfig.mockImplementation((_, getTypeValidator) => {
        getTypeValidator()
        return Promise.resolve({ type: LoadConfigStatus.Success, configs, absoluteFixturePaths: [] })
      })

      await handler(args)

      expect(mockHandleError).not.toBeCalled()
      expect(mockStartServer).toBeCalledTimes(1)
      expect(mockStartServer).toBeCalledWith(args.port, configs, mockTypeValidator)
    })
  })
})
