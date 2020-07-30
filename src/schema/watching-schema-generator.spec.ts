import { WatchingSchemaGenerator } from './watching-schema-generator'
import { randomString, mockObj, mockFn } from '~test-helpers'
import ts from 'typescript'
import { NcdcLogger } from '~logger'
import { ReportMetric } from '~commands/shared'
import TsHelpers from './ts-helpers'

jest.disableAutomock()
jest.mock('typescript-json-schema')
jest.mock('typescript')

describe('load', () => {
  const mockTypescript = mockObj(ts)
  const mockTsHelpers = mockObj<TsHelpers>({ formatErrorDiagnostic: jest.fn(), readTsConfig: jest.fn() })
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

    mockreportMetric.mockReturnValue({ success: jest.fn(), fail: jest.fn(), subMetric: jest.fn() })
  })

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const createGenerator = () =>
    new WatchingSchemaGenerator(randomString('tsconfig.json'), mockTsHelpers, mockLogger, mockreportMetric)

  it('throws an error if watching has not started yet', () => {
    const generator = createGenerator()

    expect(() => generator.load(randomString('my type'))).toThrowError('Watching has not started yet')
  })

  it('throws an error if reading the config file gives an error', () => {
    const expectedError = new Error(randomString('sad times'))
    mockTsHelpers.readTsConfig.mockImplementation(() => {
      throw expectedError
    })

    const generator = createGenerator()

    expect(() => generator.init()).toThrow(expectedError)
  })

  it('does not try to read the config file again if it is already initialised', () => {
    const generator = createGenerator()

    generator.init()
    generator.init()
    generator.init()
    generator.init()

    expect(mockTsHelpers.readTsConfig).toBeCalledTimes(1)
  })

  it.each([[true], [false]])(
    'creates a watch compiler host with the correct config overrides when %s',
    (noEmit) => {
      mockTsHelpers.readTsConfig.mockReturnValue(
        mockObj<ts.ParsedCommandLine>({ options: { noEmit } }),
      )

      createGenerator().init()

      expect(mockTypescript.createWatchCompilerHost.mock.calls[0][1]).toMatchObject({
        noEmit,
      })
    },
  )
})
