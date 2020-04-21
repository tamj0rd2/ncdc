import createHandler, { StartServer, ServeArgs } from './handler'
import { mockFn, randomString, mockObj, mocked, randomNumber } from '~test-helpers'
import { HandleError, CreateTypeValidator } from '~commands/shared'
import { TypeValidator } from '~validation'
import { readYamlAsync } from '~io'
import { ValidationSuccess, validate, transformConfigs, ValidatedServeConfig } from './config'
import { resolve } from 'path'
import { Config } from '~config'

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
  const mockTypeValidator = mockObj<TypeValidator>({ validate: jest.fn() })
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
      mockTransformConfigs.mockResolvedValue([
        { name: randomString('name'), request: {}, response: {} } as Config,
      ])
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
        message: `Could not start serving due to config errors:\n\n${errors[0]}\n${errors[1]}`,
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
      const transformedConfigs: Partial<Config>[] = [
        {
          name: randomString('name'),
          request: { method: 'DELETE', endpoint: randomString('endpoint') },
          response: { code: randomNumber() },
        },
      ]
      mockTransformConfigs.mockResolvedValue(transformedConfigs as Config[])

      await handler(args)

      expect(mockHandleError).not.toBeCalled()
      expect(mockStartServer).toBeCalledTimes(1)
      expect(mockStartServer).toBeCalledWith(args.port, transformedConfigs, mockTypeValidator)
    })

    describe('when a config has a type and body', () => {
      const transformedConfig: Partial<Config> = {
        name: randomString('name'),
        request: {
          type: randomString('request-type'),
          body: randomString('request-body'),
          endpoint: randomString(),
          method: 'GET',
        },
        response: {
          type: 'response type',
          body: 'response body',
          code: randomNumber(),
        },
      }

      beforeEach(() => {
        mockValidate.mockReturnValue({
          success: true,
          validatedConfig: [{ request: { type: randomString('type') } } as ValidatedServeConfig],
        })
        mockTransformConfigs.mockResolvedValue([transformedConfig as Config])
      })

      it('calls the body validator with the correct arguments', async () => {
        mockTypeValidator.validate.mockResolvedValue({ success: true })

        await handler(args)

        expect(mockTypeValidator.validate).toBeCalledWith(
          transformedConfig.request?.body,
          transformedConfig.request?.type,
        )
        expect(mockTypeValidator.validate).toBeCalledWith(
          transformedConfig.response?.body,
          transformedConfig.response?.type,
        )
      })

      // This can happen if the original raw config had more than 1 endpoint, or an additional serve endpoint
      it('only runs the validation once in the case two transformed configs have the same name', async () => {
        mockTransformConfigs.mockResolvedValue([transformedConfig, transformedConfig] as Config[])
        mockTypeValidator.validate.mockResolvedValue({ success: true })

        await handler(args)

        expect(mockTypeValidator.validate).toBeCalledTimes(2)
      })

      it('logs errors and exits if a config body fails type validation', async () => {
        const error1 = randomString('error-message-1')
        const error2 = randomString('error-message-2')
        const error3 = randomString('error-message-3')
        mockTypeValidator.validate.mockResolvedValueOnce({ success: false, errors: [error1, error2] })
        mockTypeValidator.validate.mockResolvedValueOnce({ success: false, errors: [error3] })

        await handler(args)

        const line1 = 'Could not start serving due to config errors:'
        const line2 = `Config '${transformedConfig.name}' request body failed type validation:\n${error1}\n${error2}`
        const line3 = `Config '${transformedConfig.name}' response body failed type validation:\n${error3}`

        expect(mockHandleError).toBeCalledWith({ message: `${line1}\n\n${line2}\n${line3}` })
      })
    })

    it('skips body type validation when a config has no body', async () => {
      mockValidate.mockReturnValue({
        success: true,
        validatedConfig: [{ request: { type: 'MyType' } }] as ValidatedServeConfig[],
      })
      mockTransformConfigs.mockResolvedValue([
        { request: { type: 'Jim' }, response: { type: 'Bob' } } as Config,
      ])

      await handler(args)

      expect(mockTypeValidator.validate).not.toBeCalled()
      expect(mockHandleError).not.toBeCalled()
    })

    it('skips body type validation when a config has no type', async () => {
      mockValidate.mockReturnValue({
        success: true,
        validatedConfig: [{ request: {}, response: {} }] as ValidatedServeConfig[],
      })
      mockTransformConfigs.mockResolvedValue([
        { request: { body: 'Jim' }, response: { body: 'Bob' } } as Config,
      ])

      await handler(args)

      expect(mockTypeValidator.validate).not.toBeCalled()
      expect(mockHandleError).not.toBeCalled()
    })
  })
})

it.skip('filters objects with a similar key', () => {
  type Item = { id: number }
  const unique = (items: Item[]) => {
    const seen = new Set<number>()
    return items.filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  }

  const items: Item[] = [{ id: 1 }, { id: 2 }, { id: 1 }, { id: 3 }, { id: 2 }]

  expect(unique(items)).toEqual([items[0], items[1], items[3]])
})
