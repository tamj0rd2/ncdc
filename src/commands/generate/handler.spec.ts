import createHandler, { GenerateArgs, GetSchemaGenerator, GetConfigTypes, GetGenerateDeps } from './handler'
import { mockFn, mockObj, randomString } from '~test-helpers'
import { HandleError } from '~commands'
import { Generate } from './generate'
import { Logger } from 'winston'
import { SchemaGenerator } from '~schema'

jest.unmock('./handler')

describe('Generate Command', () => {
  const handleErrorStub = mockFn<HandleError>()
  const getConfigTypes = mockFn<GetConfigTypes>()
  const getSchemaGenMock = mockFn<GetSchemaGenerator>()
  const generateStub = mockFn<Generate>()
  const loggerStub = mockObj<Logger>({ info: jest.fn(), warn: jest.fn() })

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const getHandler = () =>
    createHandler(
      mockFn<GetGenerateDeps>().mockReturnValue({
        logger: loggerStub,
        generate: generateStub,
        getConfigTypes,
        getSchemaGenerator: getSchemaGenMock,
        handleError: handleErrorStub,
      }),
    )

  beforeEach(() => {
    getConfigTypes.mockResolvedValue([randomString('some-type')])
  })

  afterEach(() => jest.resetAllMocks())

  describe('CLI argument validation', () => {
    it('exits with exit code 1 if no config paths are specified', async () => {
      const handler = getHandler()
      const args: GenerateArgs = {
        outputPath: '',
        tsconfigPath: '',
        force: false,
        verbose: false,
      }
      await handler(args)

      expect(handleErrorStub).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'at least 1 ncdc config path must be given' }),
      )
    })
  })

  describe('reading config file', () => {
    it('reads the config file with the correct args', async () => {
      const handler = getHandler()
      const args: GenerateArgs = {
        outputPath: '',
        tsconfigPath: '',
        configPaths: [randomString('path1'), randomString('path2')],
        force: false,
        verbose: false,
      }

      await handler(args)

      expect(getConfigTypes).toHaveBeenCalledWith(args.configPaths)
    })

    it('calls the error handler if there is a problem reading the config', async () => {
      const handler = getHandler()
      const args: GenerateArgs = {
        outputPath: '',
        tsconfigPath: '',
        configPaths: ['config path'],
        force: false,
        verbose: false,
      }

      getConfigTypes.mockRejectedValue(new Error('welp'))

      await handler(args)

      expect(handleErrorStub).toHaveBeenCalledWith(expect.objectContaining({ message: 'welp' }))
    })
  })

  it('logs a warning and exits if there are no types in the config file', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      outputPath: '',
      tsconfigPath: '',
      configPaths: ['config path'],
      force: false,
      verbose: false,
    }
    getConfigTypes.mockResolvedValue([])

    await handler(args)

    expect(loggerStub.warn).toBeCalledWith('No types were specified in the given config file')
    expect(getSchemaGenMock).not.toBeCalled()
  })

  it.each([[true], [false]])(
    'calls the schema generator with the correct args when force is %s',
    async (force) => {
      const handler = getHandler()
      const args: GenerateArgs = {
        verbose: false,
        outputPath: 'out',
        tsconfigPath: 'tsconfig',
        configPaths: ['config path'],
        force,
      }

      await handler(args)

      expect(getSchemaGenMock).toHaveBeenCalledWith('tsconfig', force)
    },
  )

  it('calls the error handler if there is a problem creating the schema generator', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      verbose: false,
      outputPath: 'out',
      tsconfigPath: 'tsconfig',
      configPaths: ['config path'],
      force: false,
    }
    getSchemaGenMock.mockImplementation(() => {
      throw new Error('wat')
    })

    await handler(args)

    expect(handleErrorStub).toHaveBeenCalledWith(expect.objectContaining({ message: 'wat' }))
  })

  it('calls generate with the correct parameters', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      verbose: false,
      outputPath: 'outYouGo',
      tsconfigPath: 'tsconfig',
      configPaths: ['config path'],
      force: false,
    }
    const types = ['WickedType', 'SickFam', 'Noice']
    getConfigTypes.mockResolvedValue(types)
    const dummySchemaGen = mockObj<SchemaGenerator>({ load: jest.fn() })
    getSchemaGenMock.mockReturnValue(dummySchemaGen)

    await handler(args)

    expect(generateStub).toHaveBeenCalledWith(dummySchemaGen, types, 'outYouGo')
  })

  it('logs a message if the schemas were written successfully', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      verbose: false,
      outputPath: 'outYouGo',
      tsconfigPath: 'tsconfig',
      configPaths: ['config path'],
      force: false,
    }

    await handler(args)

    expect(loggerStub.info).toHaveBeenCalledWith(expect.stringContaining('JSON schemas have been written'))
  })

  it('calls the error handler if there is a problem writing schemas to disk', async () => {
    const handler = getHandler()
    const args: GenerateArgs = {
      verbose: false,
      outputPath: 'outYouGo',
      tsconfigPath: 'tsconfig',
      configPaths: ['config path'],
      force: false,
    }

    await handler(args)

    expect(loggerStub.info).toHaveBeenCalledWith(expect.stringContaining('JSON schemas have been written'))
  })
})
