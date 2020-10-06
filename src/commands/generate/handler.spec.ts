import createHandler, { GenerateArgs, GetSchemaGenerator, GetConfigTypes, GetGenerateDeps } from './handler'
import { arrayOfLength, mockFn, mockObj, randomString } from '~test-helpers'
import { Generate } from './generate'
import { Logger } from 'winston'
import { SchemaGenerator } from '~schema'
import { Type } from '~config/resource/type'
import { TypeBuilder } from '~config/resource/builders'

jest.disableAutomock()

describe('Generate Command', () => {
  function createTestDeps() {
    const mockGetConfigTypes = mockFn<GetConfigTypes>()
    const mockGetSchemaGenerator = mockFn<GetSchemaGenerator>()
    const mockGenerate = mockFn<Generate>()
    const mockLogger = mockObj<Logger>({ info: jest.fn(), warn: jest.fn() })
    const dummyGetGenerateDeps = mockFn<GetGenerateDeps>().mockReturnValue({
      generate: mockGenerate,
      getConfigTypes: mockGetConfigTypes,
      getSchemaGenerator: mockGetSchemaGenerator,
      logger: mockLogger,
    })

    return {
      mockGetConfigTypes,
      mockGetSchemaGenerator,
      mockGenerate,
      mockLogger,
      handler: createHandler(dummyGetGenerateDeps),
    }
  }

  afterEach(() => jest.resetAllMocks())

  it('throws an error if no config paths are specified', async () => {
    const { handler } = createTestDeps()

    const act = handler({
      outputPath: '',
      tsconfigPath: '',
      force: false,
      verbose: false,
    })

    await expect(act).rejects.toThrowError('at least 1 ncdc config path must be given')
  })

  it('reads the config file with the correct args', async () => {
    const { mockGetConfigTypes, handler } = createTestDeps()
    mockGetConfigTypes.mockResolvedValueOnce([])
    const expectedConfigPaths = [randomString('path1'), randomString('path2')]

    await handler({
      outputPath: '',
      tsconfigPath: '',
      configPaths: expectedConfigPaths,
      force: false,
      verbose: false,
    })

    expect(mockGetConfigTypes).toHaveBeenCalledWith(expectedConfigPaths)
  })

  it('logs a warning and exits if there are no types in the config file', async () => {
    const { mockGetConfigTypes, mockGetSchemaGenerator, handler, mockLogger } = createTestDeps()
    mockGetConfigTypes.mockResolvedValue([])

    await handler({
      outputPath: '',
      tsconfigPath: '',
      configPaths: ['config path'],
      force: false,
      verbose: false,
    })

    expect(mockLogger.warn).toBeCalledWith('No types were specified in the given config file')
    expect(mockGetSchemaGenerator).not.toBeCalled()
  })

  it.each([[true], [false]])(
    'calls the schema generator with the correct args when force is %s',
    async (force) => {
      const { mockGetSchemaGenerator, handler, mockGetConfigTypes } = createTestDeps()
      mockGetConfigTypes.mockResolvedValueOnce([TypeBuilder.random()])

      await handler({
        verbose: false,
        outputPath: 'out',
        tsconfigPath: 'tsconfig',
        configPaths: ['config path'],
        force,
      })

      expect(mockGetSchemaGenerator).toHaveBeenCalledWith('tsconfig', force)
    },
  )

  it('calls generate with the correct parameters', async () => {
    const { mockGenerate, mockGetConfigTypes, mockGetSchemaGenerator, handler } = createTestDeps()
    const types = arrayOfLength(3, (i) => new Type(`type${i}`))
    mockGetConfigTypes.mockResolvedValue(types)
    const dummySchemaGen = mockObj<SchemaGenerator>({ load: jest.fn() })
    mockGetSchemaGenerator.mockReturnValue(dummySchemaGen)

    await handler({
      verbose: false,
      outputPath: 'outYouGo',
      tsconfigPath: 'tsconfig',
      configPaths: ['config path'],
      force: false,
    })

    expect(mockGenerate).toHaveBeenCalledWith(dummySchemaGen, types, 'outYouGo')
  })

  it('logs a message if the schemas were written successfully', async () => {
    const { handler, mockLogger, mockGetConfigTypes } = createTestDeps()
    mockGetConfigTypes.mockResolvedValueOnce([TypeBuilder.random()])
    const args: GenerateArgs = {
      verbose: false,
      outputPath: 'outYouGo',
      tsconfigPath: 'tsconfig',
      configPaths: ['config path'],
      force: false,
    }

    await handler(args)

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('JSON schemas have been written'))
  })

  it('calls the error handler if there is a problem writing schemas to disk', async () => {
    const { handler, mockLogger, mockGetConfigTypes } = createTestDeps()
    mockGetConfigTypes.mockResolvedValueOnce([TypeBuilder.random()])

    await handler({
      verbose: false,
      outputPath: 'outYouGo',
      tsconfigPath: 'tsconfig',
      configPaths: ['config path'],
      force: false,
    })

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('JSON schemas have been written'))
  })
})
