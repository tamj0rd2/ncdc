import { WatchingSchemaGenerator } from './watching-schema-generator'
import { randomString, mockObj, mockFn } from '~test-helpers'
import ts from 'typescript'
import * as tsHelpers from './ts-helpers'
import { NcdcLogger } from '~logger'
import { ReportMetric } from '~commands/shared'

jest.disableAutomock()
jest.mock('typescript-json-schema')
jest.mock('typescript')
jest.mock('./ts-helpers')

describe('load', () => {
  const mockTypescript = mockObj(ts)
  const mockTsHelpers = mockObj(tsHelpers)
  const mockLogger = mockObj<NcdcLogger>({})
  const mockreportMetric = mockFn<ReportMetric>()

  beforeEach(() => {
    jest.resetAllMocks()
    mockTypescript.readConfigFile.mockReturnValue({ config: {} })
    mockTypescript.createWatchCompilerHost.mockReturnValue(
      {} as ts.WatchCompilerHostOfFilesAndCompilerOptions<ts.BuilderProgram>,
    )
    mockTsHelpers.readTsConfig.mockReturnValue(
      mockObj<ts.ParsedCommandLine>({ options: {} }),
    )

    mockreportMetric.mockReturnValue({ success: jest.fn(), fail: jest.fn() })
  })

  it('throws an error if watching has not started yet', () => {
    const generator = new WatchingSchemaGenerator(randomString('tsconfig path'), mockLogger, mockreportMetric)

    expect(() => generator.load(randomString('my type'))).toThrowError('Watching has not started yet')
  })

  it('throws an error if reading the config file gives an error', () => {
    const expectedError = new Error(randomString('sad times'))
    mockTsHelpers.readTsConfig.mockImplementation(() => {
      throw expectedError
    })

    const generator = new WatchingSchemaGenerator(randomString('tsconfig path'), mockLogger, mockreportMetric)

    expect(() => generator.init()).toThrow(expectedError)
  })

  it('does not try to read the config file again if it is already initialised', () => {
    const generator = new WatchingSchemaGenerator(randomString('tsconfig path'), mockLogger, mockreportMetric)

    generator.init()
    generator.init()
    generator.init()
    generator.init()

    expect(mockTsHelpers.readTsConfig).toBeCalledTimes(1)
  })

  it.each([
    [{ incremental: false, composite: false }, true],
    [{ incremental: true, composite: true }, false],
    [{ incremental: false, composite: true }, false],
    [{ incremental: true, composite: false }, false],
  ])('creates a watch compiler host with the correct config overrides when %o', (options, expected) => {
    mockTsHelpers.readTsConfig.mockReturnValue(
      mockObj<ts.ParsedCommandLine>({ options }),
    )

    new WatchingSchemaGenerator(randomString('tsconfig path'), mockLogger, mockreportMetric).init()

    expect(mockTypescript.createWatchCompilerHost.mock.calls[0][1]).toMatchObject({
      noEmit: expected,
    })
  })
})
