import { mockObj, randomString } from '~test-helpers'
import ts from 'typescript'
import TsHelpers from './ts-helpers'
import { ReportMetric } from '~commands/shared'
import { NcdcLogger } from '~logger'

jest.disableAutomock()
jest.mock('typescript')
jest.mock('path')

describe('create program', () => {
  function createTestDeps() {
    const spyLogger = mockObj<NcdcLogger>({ verbose: jest.fn() })
    const dummyReportMetric: ReportMetric = () => ({
      fail: jest.fn(),
      subMetric: jest.fn(),
      success: jest.fn(),
    })
    const helpers = new TsHelpers(dummyReportMetric, spyLogger)
    const tsconfigPath = randomString('tsconfig.json')
    const mockTs = mockObj(ts)

    return {
      spyLogger,
      spyReportMetric: dummyReportMetric,
      helpers,
      tsconfigPath,
      mockTs,
    }
  }

  beforeEach(() => {
    // jest.resetAllMocks()
    // spyReportMetric.mockReturnValue({ fail: jest.fn(), subMetric: jest.fn(), success: jest.fn() })
    // mockTs.readConfigFile.mockReturnValue({ config: {} })
    // mockTs.parseJsonConfigFileContent.mockReturnValue({
    //   errors: [],
    //   options: {},
    //   fileNames: [],
    // })
  })

  afterEach(() => jest.resetAllMocks())

  it('creates a regular ts program when incremental and composite are not set', () => {
    const { helpers, mockTs, tsconfigPath } = createTestDeps()
    mockTs.readConfigFile.mockReturnValue({ config: {} })
    mockTs.parseJsonConfigFileContent.mockReturnValue({
      errors: [],
      options: {},
      fileNames: [],
    })

    const expectedProgram = mockObj<ts.Program>({ emit: jest.fn() })
    mockTs.createProgram.mockReturnValueOnce(expectedProgram)

    const result = helpers.createProgram(tsconfigPath, { shouldTypecheck: false })

    expect(result).toStrictEqual(expectedProgram)
  })

  it('creates an incremental program when incremental is set', () => {
    const { helpers, mockTs, tsconfigPath } = createTestDeps()
    mockTs.readConfigFile.mockReturnValue({ config: {} })
    mockTs.parseJsonConfigFileContent.mockReturnValueOnce({
      errors: [],
      options: { incremental: true },
      fileNames: [],
    })
    const expectedProgram = mockObj<ts.Program>({ emit: jest.fn() })
    mockTs.createIncrementalProgram.mockReturnValueOnce(
      mockObj<ts.BuilderProgram>({ getProgram: jest.fn().mockReturnValue(expectedProgram) }),
    )

    const result = helpers.createProgram(tsconfigPath, { shouldTypecheck: false })

    expect(result).toStrictEqual(expectedProgram)
  })

  it('ignores pre emit diagnostics when shouldTypecheck is false', () => {
    const { helpers, mockTs, tsconfigPath } = createTestDeps()
    mockTs.readConfigFile.mockReturnValue({ config: {} })
    mockTs.parseJsonConfigFileContent.mockReturnValue({
      errors: [],
      options: {},
      fileNames: [],
    })

    helpers.createProgram(tsconfigPath, { shouldTypecheck: false })

    expect(mockTs.getPreEmitDiagnostics).not.toBeCalled()
  })

  it('fails on pre emit diagnostics when shouldTypecheck is true and there were errors', () => {
    const { helpers, mockTs, spyLogger, tsconfigPath } = createTestDeps()
    mockTs.readConfigFile.mockReturnValue({ config: {} })
    mockTs.parseJsonConfigFileContent.mockReturnValue({
      errors: [],
      options: {},
      fileNames: [],
    })
    mockTs.getPreEmitDiagnostics.mockReturnValueOnce([mockObj<ts.Diagnostic>({ code: 567 })])

    expect(() => helpers.createProgram(tsconfigPath, { shouldTypecheck: true })).toThrowError(
      'project has compilation errors',
    )
    expect(spyLogger.verbose).toBeCalledWith(expect.stringContaining('Error 567'))
  })

  it('throws an error when there is an error reading a raw config file', () => {
    const { helpers, mockTs, tsconfigPath } = createTestDeps()
    mockTs.readConfigFile.mockReturnValueOnce({ error: mockObj<ts.Diagnostic>({ code: 123 }) })

    expect(() => helpers.createProgram(tsconfigPath, { shouldTypecheck: false })).toThrowError('Error 123:')
  })

  it('throws an error when there is apparently no config', () => {
    const { helpers, mockTs, tsconfigPath } = createTestDeps()
    mockTs.readConfigFile.mockReturnValueOnce({})

    expect(() => helpers.createProgram(tsconfigPath, { shouldTypecheck: false })).toThrowError(
      'Could not parse your tsconfig file',
    )
  })

  it('throws an error when parsing the content of tsconfig gives errors', () => {
    const { helpers, mockTs, tsconfigPath } = createTestDeps()
    mockTs.readConfigFile.mockReturnValue({ config: {} })
    mockTs.parseJsonConfigFileContent.mockReturnValueOnce({
      errors: [mockObj<ts.Diagnostic>({ code: 321 })],
      options: {},
      fileNames: [],
    })

    expect(() => helpers.createProgram(tsconfigPath, { shouldTypecheck: false })).toThrowError('Error 321:')
  })

  it('throws an error when building a program fails', () => {
    const { helpers, mockTs, tsconfigPath } = createTestDeps()
    mockTs.readConfigFile.mockReturnValue({ config: {} })
    mockTs.parseJsonConfigFileContent.mockReturnValue({
      errors: [],
      options: {},
      fileNames: [],
    })
    mockTs.createProgram.mockImplementation(() => {
      throw new Error('Oh no')
    })

    expect(() => helpers.createProgram(tsconfigPath, { shouldTypecheck: false })).toThrowError(
      'project has compilation errors',
    )
  })

  describe('when composite is true', () => {
    it('builds a solution', () => {
      const { helpers, mockTs, tsconfigPath } = createTestDeps()
      const expectedProgram = mockObj<ts.Program>({ emit: jest.fn() })
      const builder = mockObj<ts.SolutionBuilder<ts.EmitAndSemanticDiagnosticsBuilderProgram>>({
        build: jest.fn(),
      })
      mockTs.readConfigFile.mockReturnValue({ config: {} })
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

      helpers.createProgram(tsconfigPath, { shouldTypecheck: false })

      expect(builder.build).toBeCalled()
    })

    it('does not build a solution if the skip flag is true', () => {
      const { helpers, mockTs, tsconfigPath } = createTestDeps()
      const expectedProgram = mockObj<ts.Program>({ emit: jest.fn() })
      const builder = mockObj<ts.SolutionBuilder<ts.EmitAndSemanticDiagnosticsBuilderProgram>>({
        build: jest.fn(),
      })
      mockTs.readConfigFile.mockReturnValue({ config: {} })
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

      helpers.createProgram(tsconfigPath, { shouldTypecheck: false, skipBuildingSolution: true })

      expect(builder.build).not.toBeCalled()
    })

    it('throws an error if the solution could not be built', () => {
      const { helpers, mockTs, tsconfigPath } = createTestDeps()
      const expectedProgram = mockObj<ts.Program>({ emit: jest.fn() })
      const builder = mockObj<ts.SolutionBuilder<ts.EmitAndSemanticDiagnosticsBuilderProgram>>({
        build: jest.fn(),
      })
      mockTs.readConfigFile.mockReturnValue({ config: {} })
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
      builder.build.mockReturnValue(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped)

      expect(() => helpers.createProgram(tsconfigPath, { shouldTypecheck: false })).toThrowError(
        'project has compilation errors',
      )
    })

    it('returns an incremental program', () => {
      const { helpers, mockTs, tsconfigPath } = createTestDeps()
      const expectedProgram = mockObj<ts.Program>({ emit: jest.fn() })
      const builder = mockObj<ts.SolutionBuilder<ts.EmitAndSemanticDiagnosticsBuilderProgram>>({
        build: jest.fn(),
      })
      mockTs.readConfigFile.mockReturnValue({ config: {} })
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

      const result = helpers.createProgram(tsconfigPath, { shouldTypecheck: false })

      expect(result).toStrictEqual(expectedProgram)
    })

    it('does not do a manual typecheck even when typechecking is enabled', () => {
      const { helpers, mockTs, tsconfigPath } = createTestDeps()
      const expectedProgram = mockObj<ts.Program>({ emit: jest.fn() })
      const builder = mockObj<ts.SolutionBuilder<ts.EmitAndSemanticDiagnosticsBuilderProgram>>({
        build: jest.fn(),
      })
      mockTs.readConfigFile.mockReturnValue({ config: {} })
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

      helpers.createProgram(tsconfigPath, { shouldTypecheck: true })

      expect(ts.getPreEmitDiagnostics).not.toBeCalled()
    })
  })
})
