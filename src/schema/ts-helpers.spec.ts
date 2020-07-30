import { mockObj, mockFn, randomString } from '~test-helpers'
import ts from 'typescript'
import TsHelpers from './ts-helpers'
import { ReportMetric } from '~commands/shared'
import { NcdcLogger } from '~logger'

jest.disableAutomock()
jest.mock('typescript')
jest.mock('path')

describe('create program', () => {
  const spyLogger = mockObj<NcdcLogger>({ verbose: jest.fn() })
  const spyReportMetric = mockFn<ReportMetric>()
  const helpers = new TsHelpers(spyReportMetric, spyLogger)

  const tsconfigPath = randomString('tsconfig.json')
  const mockTs = mockObj(ts)

  beforeEach(() => {
    jest.resetAllMocks()
    spyReportMetric.mockReturnValue({ fail: jest.fn(), subMetric: jest.fn(), success: jest.fn() })
    mockTs.readConfigFile.mockReturnValue({ config: {} })
    mockTs.parseJsonConfigFileContent.mockReturnValue({
      errors: [],
      options: {},
      fileNames: [],
    })
  })

  it('creates a regular ts program when incremental and composite are not set', () => {
    const expectedProgram = mockObj<ts.Program>({ emit: jest.fn() })
    mockTs.createProgram.mockReturnValueOnce(expectedProgram)

    const result = helpers.createProgram(tsconfigPath, false)

    expect(result).toStrictEqual(expectedProgram)
  })

  it('creates an incremental program when incremental is set', () => {
    mockTs.parseJsonConfigFileContent.mockReturnValueOnce({
      errors: [],
      options: { incremental: true },
      fileNames: [],
    })
    const expectedProgram = mockObj<ts.Program>({ emit: jest.fn() })
    mockTs.createIncrementalProgram.mockReturnValueOnce(
      mockObj<ts.BuilderProgram>({ getProgram: jest.fn().mockReturnValue(expectedProgram) }),
    )

    const result = helpers.createProgram(tsconfigPath, false)

    expect(result).toStrictEqual(expectedProgram)
  })

  it('ignores pre emit diagnostics when shouldTypecheck is false', () => {
    helpers.createProgram(tsconfigPath, false)

    expect(mockTs.getPreEmitDiagnostics).not.toBeCalled()
  })

  it('fails on pre emit diagnostics when shouldTypecheck is true and there were errors', () => {
    mockTs.getPreEmitDiagnostics.mockReturnValueOnce([mockObj<ts.Diagnostic>({ code: 567 })])

    expect(() => helpers.createProgram(tsconfigPath, true)).toThrowError('project has compilation errors')
    expect(spyLogger.verbose).toBeCalledWith(expect.stringContaining('Error 567'))
  })

  it('throws an error when there is an error reading a raw config file', () => {
    mockTs.readConfigFile.mockReturnValueOnce({ error: mockObj<ts.Diagnostic>({ code: 123 }) })

    expect(() => helpers.createProgram(tsconfigPath, false)).toThrowError('Error 123:')
  })

  it('throws an error when there is apparently no config', () => {
    mockTs.readConfigFile.mockReturnValueOnce({})

    expect(() => helpers.createProgram(tsconfigPath, false)).toThrowError(
      'Could not parse your tsconfig file',
    )
  })

  it('throws an error when parsing the content of tsconfig gives errors', () => {
    mockTs.parseJsonConfigFileContent.mockReturnValueOnce({
      errors: [mockObj<ts.Diagnostic>({ code: 321 })],
      options: {},
      fileNames: [],
    })

    expect(() => helpers.createProgram(tsconfigPath, false)).toThrowError('Error 321:')
  })

  it('throws an error when building a program fails', () => {
    mockTs.createProgram.mockImplementation(() => {
      throw new Error('Oh no')
    })

    expect(() => helpers.createProgram(tsconfigPath, false)).toThrowError('project has compilation errors')
  })

  describe('when composite is true', () => {
    const expectedProgram = mockObj<ts.Program>({ emit: jest.fn() })
    const builder = mockObj<ts.SolutionBuilder<ts.EmitAndSemanticDiagnosticsBuilderProgram>>({
      build: jest.fn(),
    })

    beforeEach(() => {
      mockTs.createIncrementalProgram.mockReturnValueOnce(
        mockObj<ts.BuilderProgram>({ getProgram: jest.fn().mockReturnValueOnce(expectedProgram) }),
      )
      mockTs.parseJsonConfigFileContent.mockReturnValueOnce({
        errors: [],
        options: { composite: true },
        fileNames: [],
      })

      builder.build.mockReturnValue(ts.ExitStatus.Success)
      mockTs.createSolutionBuilder.mockReturnValueOnce(builder)
    })

    it('builds a solution', () => {
      helpers.createProgram(tsconfigPath, false)

      expect(builder.build).toBeCalled()
    })

    it('throws an error if the solution could not be built', () => {
      builder.build.mockReturnValue(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped)

      expect(() => helpers.createProgram(tsconfigPath, false)).toThrowError('project has compilation errors')
    })

    it('returns an incremental program', () => {
      const result = helpers.createProgram(tsconfigPath, false)

      expect(result).toStrictEqual(expectedProgram)
    })

    it('does not do a manual typecheck even when typechecking is enabled', () => {
      helpers.createProgram(tsconfigPath, true)

      expect(ts.getPreEmitDiagnostics).not.toBeCalled()
    })
  })
})
