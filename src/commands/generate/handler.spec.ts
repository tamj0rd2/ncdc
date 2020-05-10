import createHandler, { GenerateArgs, GetSchemaGenerator } from './handler'
import { mockFn, mockObj, DeepPartial, randomString, mocked } from '~test-helpers'
import { ReadGenerateConfig, GenerateConfig } from './config'
import { HandleError } from '~commands'
import { Generate } from './generate'
import { Logger } from 'winston'
import { SchemaGenerator } from '~schema'
import { resolve } from 'path'

jest.unmock('./handler')
jest.mock('path')

describe('Generate Command', () => {
  const handleErrorStub = mockFn<HandleError>()
  const readConfigMock = mockFn<ReadGenerateConfig>()
  const getSchemaGenMock = mockFn<GetSchemaGenerator>()
  const generateStub = mockFn<Generate>()
  const loggerStub = mockObj<Logger>({ info: jest.fn() })
  const mockResolve = mocked(resolve)

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const getHandler = () =>
    createHandler(handleErrorStub, readConfigMock, getSchemaGenMock, generateStub, loggerStub)

  afterEach(() => jest.resetAllMocks())

  it('exits with exit code 1 if a config path was not specified', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      outputPath: '',
      tsconfigPath: '',
      force: false,
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
      force: false,
    }
    const resolvedConfigPath = randomString('resolved config path')
    mockResolve.mockReturnValue(resolvedConfigPath)

    readConfigMock.mockResolvedValue([])

    await handler(args)

    expect(readConfigMock).toHaveBeenCalledWith(resolvedConfigPath)
  })

  it('calls the error handler if there is a problem reading the config', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      outputPath: '',
      tsconfigPath: '',
      configPath: 'config path',
      force: false,
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
      force: false,
    }

    const configs: DeepPartial<GenerateConfig>[] = [
      { request: {}, response: {} },
      { request: {}, response: {} },
    ]
    readConfigMock.mockResolvedValue(configs as GenerateConfig[])

    await handler(args)

    expect(handleErrorStub).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No custom types were specified in the given config file' }),
    )
  })

  it.each([[true], [false]])(
    'calls the schema generator with the correct args when force is %s',
    async (force) => {
      const handler = getHandler()
      const args: GenerateArgs = {
        outputPath: 'out',
        tsconfigPath: 'tsconfig',
        configPath: 'config path',
        force,
      }

      const configs: DeepPartial<GenerateConfig>[] = [{ request: { type: 'WickedType' }, response: {} }]
      readConfigMock.mockResolvedValue(configs as GenerateConfig[])

      await handler(args)

      expect(getSchemaGenMock).toHaveBeenCalledWith('tsconfig', force)
    },
  )

  it('calls the error handler if there is a problem creating the schema generator', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      outputPath: 'out',
      tsconfigPath: 'tsconfig',
      configPath: 'config path',
      force: false,
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
      force: false,
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
      force: false,
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
      force: false,
    }

    const configs: DeepPartial<GenerateConfig>[] = [{ request: { type: 'WickedType' }, response: {} }]
    readConfigMock.mockResolvedValue(configs as GenerateConfig[])

    await handler(args)

    expect(loggerStub.info).toHaveBeenCalledWith(expect.stringContaining('JSON schemas have been written'))
  })
})
