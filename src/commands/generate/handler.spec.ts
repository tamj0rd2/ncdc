import createHandler, { GenerateArgs, GetSchemaGenerator } from './handler'
import { mockFn, mockObj, DeepPartial } from '~test-helpers'
import { ReadGenerateConfig, GenerateConfig } from './config'
import { HandleError } from '~commands'
import { Generate } from './generate'
import { Logger } from 'winston'
import { SchemaGenerator } from '~schema'

jest.unmock('./handler')

describe('Generate Command', () => {
  const handleErrorStub = mockFn<HandleError>()
  const readConfigMock = mockFn<ReadGenerateConfig>()
  const getSchemaGenMock = mockFn<GetSchemaGenerator>()
  const generateStub = mockFn<Generate>()
  const loggerStub = mockObj<Logger>({ info: jest.fn() })

  const getHandler = (isDev = false) =>
    createHandler(handleErrorStub, isDev, readConfigMock, getSchemaGenMock, generateStub, loggerStub)

  afterEach(() => jest.resetAllMocks())

  it('exits with exit code 1 if a config path was not specified', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      outputPath: '',
      tsconfigPath: '',
    }
    await handler(args)

    expect(handleErrorStub).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'configPath must be specified' }),
    )
  })

  it('reads the generate config with the correct args', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      outputPath: '',
      tsconfigPath: '',
      configPath: 'config path',
    }

    readConfigMock.mockResolvedValue([])

    await handler(args)

    expect(readConfigMock).toHaveBeenCalledWith('config path')
  })

  it('calls the error handler if there is a problem reading the config', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      outputPath: '',
      tsconfigPath: '',
      configPath: 'config path',
    }

    readConfigMock.mockRejectedValue(new Error('welp'))

    await handler(args)

    expect(handleErrorStub).toHaveBeenCalledWith(expect.objectContaining({ message: 'welp' }))
  })

  it('logs a message if there are no types in the config', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      outputPath: '',
      tsconfigPath: '',
      configPath: 'config path',
    }

    const configs: DeepPartial<GenerateConfig>[] = [
      { request: {}, response: {} },
      { request: {}, response: {} },
    ]
    readConfigMock.mockResolvedValue(configs as GenerateConfig[])

    await handler(args)

    expect(loggerStub.info).toHaveBeenCalledWith(expect.stringContaining('No types were specified'))
  })

  it('logs a message if there are only built-in types in the config', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      outputPath: '',
      tsconfigPath: '',
      configPath: 'config path',
    }

    const configs: DeepPartial<GenerateConfig>[] = [
      { request: { type: 'string' }, response: {} },
      { request: {}, response: { type: 'object' } },
    ]
    readConfigMock.mockResolvedValue(configs as GenerateConfig[])

    await handler(args)

    expect(loggerStub.info).toHaveBeenCalledWith(expect.stringContaining('No types were specified'))
  })

  it.each([[true], [false]])(
    'calls the schema generator with the correct args when dev mode is %s',
    async isDev => {
      const handler = getHandler(isDev)
      const args: GenerateArgs = {
        outputPath: 'out',
        tsconfigPath: 'tsconfig',
        configPath: 'config path',
      }

      const configs: DeepPartial<GenerateConfig>[] = [{ request: { type: 'WickedType' }, response: {} }]
      readConfigMock.mockResolvedValue(configs as GenerateConfig[])

      await handler(args)

      expect(getSchemaGenMock).toHaveBeenCalledWith('tsconfig', isDev)
    },
  )

  it('calls the error handler if there is a problem creating the schema generator', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      outputPath: 'out',
      tsconfigPath: 'tsconfig',
      configPath: 'config path',
    }

    const configs: DeepPartial<GenerateConfig>[] = [{ request: { type: 'WickedType' }, response: {} }]
    readConfigMock.mockResolvedValue(configs as GenerateConfig[])

    getSchemaGenMock.mockImplementation(() => {
      throw new Error('wat')
    })

    await handler(args)

    expect(handleErrorStub).toHaveBeenCalledWith(expect.objectContaining({ message: 'wat' }))
  })

  it('calls generate with the correct parameters', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      outputPath: 'outYouGo',
      tsconfigPath: 'tsconfig',
      configPath: 'config path',
    }

    const configs: DeepPartial<GenerateConfig>[] = [
      { request: { type: 'WickedType' }, response: {} },
      { request: { type: 'SickFam' }, response: { type: 'Noice' } },
    ]
    readConfigMock.mockResolvedValue(configs as GenerateConfig[])
    const dummySchemaGen = mockObj<SchemaGenerator>({ load: jest.fn() })
    getSchemaGenMock.mockReturnValue(dummySchemaGen)

    await handler(args)

    expect(generateStub).toHaveBeenCalledWith(
      dummySchemaGen,
      expect.arrayContaining(['WickedType', 'SickFam', 'Noice']),
      'outYouGo',
    )
  })

  it('logs a message if the schemas were written successfully', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      outputPath: 'outYouGo',
      tsconfigPath: 'tsconfig',
      configPath: 'config path',
    }

    const configs: DeepPartial<GenerateConfig>[] = [{ request: { type: 'WickedType' }, response: {} }]
    readConfigMock.mockResolvedValue(configs as GenerateConfig[])

    await handler(args)

    expect(loggerStub.info).toHaveBeenCalledWith(expect.stringContaining('JSON schemas have been written'))
  })

  it('calls the error handler if there is a problem writing schemas to disk', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      outputPath: 'outYouGo',
      tsconfigPath: 'tsconfig',
      configPath: 'config path',
    }

    const configs: DeepPartial<GenerateConfig>[] = [{ request: { type: 'WickedType' }, response: {} }]
    readConfigMock.mockResolvedValue(configs as GenerateConfig[])

    await handler(args)

    expect(loggerStub.info).toHaveBeenCalledWith(expect.stringContaining('JSON schemas have been written'))
  })
})
