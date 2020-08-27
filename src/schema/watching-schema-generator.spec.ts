import { WatchingSchemaGenerator } from './watching-schema-generator'
import { randomString, mockObj, mockFn, mocked } from '~test-helpers'
import ts from 'typescript'
import { NcdcLogger } from '~logger'
import { ReportMetric } from '~commands/shared'
import TsHelpers from './ts-helpers'
import { resolve } from 'path'

jest.disableAutomock()
jest.mock('typescript')
jest.mock('./schema-generator')
jest.mock('path')

describe('watching schema generator', () => {
  const mockedTs = mockObj(ts)
  const stubSolutionBuilderHost = mockObj<ts.SolutionBuilderWithWatchHost<ts.BuilderProgram>>({})
  const stubSolution = mockObj<ts.SolutionBuilder<ts.EmitAndSemanticDiagnosticsBuilderProgram>>({
    getNextInvalidatedProject: jest.fn(),
    build: jest.fn(),
  })
  const resolvedTsconfigPath = randomString('resolved tsconfig path')
  const stubTsHelpers = mockObj<TsHelpers>({ createProgram: jest.fn() })
  const spyLogger = mockObj<NcdcLogger>({ verbose: jest.fn() })
  const spyReportMetric = mockFn<ReportMetric>()
  const stubResolve = mocked(resolve)

  beforeEach(() => {
    stubResolve.mockReturnValue(resolvedTsconfigPath)
    mockedTs.createSolutionBuilderWithWatchHost.mockReturnValue(stubSolutionBuilderHost)
    mockedTs.createSolutionBuilderWithWatch.mockReturnValue(stubSolution)
    stubSolution.build.mockReturnValue(ts.ExitStatus.Success)
    spyReportMetric.mockReturnValue({ fail: jest.fn(), subMetric: jest.fn(), success: jest.fn() })
  })

  afterEach(() => jest.resetAllMocks())

  describe('init', () => {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const initialiseGenerator = async () => {
      const gen = new WatchingSchemaGenerator(
        randomString('tsconfig path'),
        stubTsHelpers,
        spyLogger,
        spyReportMetric,
      )
      await gen.init()
      return gen
    }

    it('can only be initiated once', async () => {
      await initialiseGenerator().then((gen) => gen.init())

      expect(stubSolution.build).toBeCalledTimes(1)
    })
  })

  describe('load', () => {
    it('throws an error if the generator has not been initiated', async () => {
      const gen = new WatchingSchemaGenerator(
        randomString('tsconfig path'),
        stubTsHelpers,
        spyLogger,
        spyReportMetric,
      )

      await expect(gen.load(randomString('my type'))).rejects.toThrowError(
        'Watcher has not been initiated yet',
      )
    })
  })
})
