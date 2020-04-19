import createHandler, { StartServer, ServeArgs } from './handler'
import { mockFn, randomString, mockObj, mocked, randomNumber } from '~test-helpers'
import { HandleError, CreateTypeValidator } from '~commands/shared'
import { TypeValidator } from '~validation'
import { readYamlAsync } from '~io'
import { ValidationSuccess, validate, transformConfigs, ValidatedServeConfig } from './config'
import { resolve } from 'path'
import { Config } from '~config'
import { config } from 'winston'

jest.unmock('./handler')
jest.unmock('@hapi/joi')
jest.mock('path')

type RawConfig = ValidationSuccess['validatedConfig']

const createRawConfig = (): RawConfig[number] => {
  return {
    name: randomString(),
    serveOnly: false,
    request: {
      method: 'GET',
    },
    response: {
      code: randomNumber(),
    },
  }
}

describe('handler', () => {
  jest.spyOn(console, 'error').mockImplementation()
  const mockHandleError = mockFn<HandleError>()
  const mockTypeValidator = mockObj<TypeValidator>({})
  const mockCreateTypeValidator = mockFn<CreateTypeValidator>()
  const mockStartServer = mockFn<StartServer>()

  const handler = createHandler(mockHandleError, mockCreateTypeValidator, mockStartServer)

  beforeEach(() => {
    jest.resetAllMocks()
    mockCreateTypeValidator.mockReturnValue(mockTypeValidator)
  })

  it('handles when a config path is not supplied', async () => {
    await handler({ force: false, port: 8001, tsconfigPath: randomString() })

    expect(mockHandleError).toBeCalledWith({ message: 'config path must be supplied' })
  })

  it('handles when port is not a number', async () => {
    await handler({ force: false, port: NaN, tsconfigPath: randomString(), configPath: randomString() })

    expect(mockHandleError).toBeCalledWith({ message: 'port must be a number' })
  })

  const args: ServeArgs = {
    force: false,
    port: 4000,
    tsconfigPath: randomString(),
    configPath: randomString(),
  }

  describe('runs the server with the correct configs', () => {
    const mockReadYamlAsync = mocked(readYamlAsync)
    const mockResolve = mocked(resolve)
    const mockValidate = mocked(validate)
    const mockTransformConfigs = mocked(transformConfigs)

    beforeEach(() => {
      mockValidate.mockReturnValue({ success: true, validatedConfig: [] })
    })

    it('calls readYamlAsync with the correct config path', async () => {
      const resolvedPath = 'wot m8'
      mockResolve.mockReturnValue(resolvedPath)

      await handler(args)

      expect(mockResolve).toBeCalledWith(args.configPath)
      expect(mockReadYamlAsync).toBeCalledWith(resolvedPath)
    })

    it('calls validate with the correct args', async () => {
      const rawConfigs: unknown[] = [{ name: 'My Raw Config' }]
      mockReadYamlAsync.mockResolvedValue(rawConfigs)

      await handler(args)

      expect(mockValidate).toBeCalledWith(rawConfigs)
    })

    it('logs config errors and exists when initial validation fails', async () => {
      const errors = [randomString(), randomString()]
      mockValidate.mockReturnValue({ success: false, errors })

      await handler(args)

      expect(mockHandleError).toBeCalledWith({
        message: `Could not start serving due to config errors:\n${errors[0]}\n${errors[1]}`,
      })
    })

    it('logs a message and exits if there are no configs to serve', async () => {
      mockValidate.mockReturnValue({ success: true, validatedConfig: [] })

      await handler(args)

      expect(mockHandleError).toBeCalledWith({ message: 'No configs to serve' })
    })

    it('does not create a type validator if no configs have associated types', async () => {
      const validatedConfig: RawConfig = [createRawConfig()]
      mockValidate.mockReturnValue({ success: true, validatedConfig })

      await handler(args)

      expect(mockCreateTypeValidator).not.toBeCalled()
    })

    it('creates a type validator with the correct args when types are present in any config', async () => {
      const config1 = createRawConfig()
      config1.response.type = randomString()
      const validatedConfig: RawConfig = [config1]
      mockValidate.mockReturnValue({ success: true, validatedConfig })

      await handler(args)

      expect(mockCreateTypeValidator).toBeCalledWith(args.tsconfigPath, args.force, args.schemaPath)
    })

    it('calls the transform func with the correct args', async () => {
      const config = createRawConfig()
      const validatedConfig: ValidatedServeConfig[] = [config]
      mockValidate.mockReturnValue({ success: true, validatedConfig })
      const absoulteConfigPath = randomString()
      mockResolve.mockReturnValue(absoulteConfigPath)

      await handler(args)

      expect(mockTransformConfigs).toBeCalledWith(validatedConfig, absoulteConfigPath)
    })

    it('runs the server with the correct args', async () => {
      const config = createRawConfig()
      config.request.type = 'boooring'
      mockValidate.mockReturnValue({ success: true, validatedConfig: [config] })
      const transformedConfig: Partial<Config> = { name: 'Hoorah!' }
      mockTransformConfigs.mockResolvedValue([transformedConfig as Config])

      await handler(args)

      expect(mockStartServer).toBeCalledTimes(1)
      expect(mockStartServer).toBeCalledWith(args.port, [transformedConfig], mockTypeValidator)
    })
  })
})
