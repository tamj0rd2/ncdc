import { SchemaGenerator } from './schema-generator'
import ts from 'typescript'
import { mockObj, randomString, mockFn } from '~test-helpers'
import * as tsHelpers from './ts-helpers'
import { ReportMetric } from '~commands/shared'
import * as tsj from 'ts-json-schema-generator'
import { NoRootTypeError } from 'ts-json-schema-generator'
import { Logger } from 'winston'
import { OperationResult } from '~metrics'

jest.disableAutomock()
jest.mock('ts-json-schema-generator')
jest.mock('typescript')
jest.mock('path')
jest.mock('fs')
jest.mock('./ts-helpers')

describe('SchemaLoader', () => {
  const mockedTsj = mockObj(tsj)
  const mockedTsjGenerator = mockObj<tsj.SchemaGenerator>({ createSchema: jest.fn() })
  const mockedTypescript = mockObj(ts)
  const mockedTsHelpers = mockObj(tsHelpers)
  const mockedreportMetric = mockFn<ReportMetric>()
  const spyLogger = mockObj<Logger>({ verbose: jest.fn() })

  beforeEach(() => {
    jest.resetAllMocks()
    mockedTypescript.parseJsonConfigFileContent.mockReturnValue(
      mockObj<ts.ParsedCommandLine>({ options: {} }),
    )
    mockedTypescript.createIncrementalProgram.mockReturnValue(
      mockObj<ts.EmitAndSemanticDiagnosticsBuilderProgram>({
        getProgram: jest.fn().mockReturnValue(mockObj<ts.Program>({})),
      }),
    )
    mockedTypescript.getPreEmitDiagnostics.mockReturnValue([])
    mockedTsj.SchemaGenerator.mockImplementation(() => mockedTsjGenerator)
    mockedTsHelpers.readTsConfig.mockReturnValue({} as ts.ParsedCommandLine)
    mockedTsHelpers.formatErrorDiagnostic.mockImplementation(({ messageText }) =>
      typeof messageText === 'string' ? messageText : 'poop',
    )

    mockedreportMetric.mockReturnValue(
      mockObj<OperationResult>({ fail: jest.fn(), success: jest.fn() }),
    )
  })

  const createSchemaGenerator = (
    pathOrProgram: string | ts.Program = '',
    skipTypeChecking = false,
  ): SchemaGenerator => new SchemaGenerator(pathOrProgram, skipTypeChecking, mockedreportMetric, spyLogger)

  describe('when a tsconfig path is given', () => {
    const tsconfigPath = 'tsconfig path'

    it('throws when there are errors and skipTypeChecking is false', () => {
      mockedTypescript.getPreEmitDiagnostics.mockReturnValue([
        mockObj<ts.Diagnostic>({ messageText: 'woah' }),
      ])

      const schemaLoader = createSchemaGenerator(tsconfigPath)

      expect(() => schemaLoader.init()).toThrowError('Your typescript project has compilation errors')
      expect(spyLogger.verbose).toBeCalledWith('woah')
    })

    it('does not throw when there are no errors and skipTypeChecking is false', () => {
      mockedTypescript.getPreEmitDiagnostics.mockReturnValue([])

      const schemaLoader = createSchemaGenerator(tsconfigPath)

      expect(() => schemaLoader.init()).not.toThrowError()
    })

    it('does not typecheck if skipTypeChecking is true', () => {
      mockedTypescript.getPreEmitDiagnostics.mockReturnValue([
        mockObj<ts.Diagnostic>({ messageText: 'woah' }),
      ])

      const schemaLoader = createSchemaGenerator(tsconfigPath, true)

      expect(() => schemaLoader.init()).not.toThrowError()
      expect(mockedTypescript.getPreEmitDiagnostics).not.toBeCalled()
    })
  })

  it('calls read ts config with the correct args', () => {
    const tsconfigPath = randomString('tsconfig path')

    createSchemaGenerator(tsconfigPath).init()

    expect(mockedTsHelpers.readTsConfig).toBeCalledWith(tsconfigPath)
  })

  describe('loading schemas', () => {
    it('throws if there is no generator', async () => {
      const schemaGenerator = createSchemaGenerator('tsconfig path', true)

      await expect(() => schemaGenerator.load('bananas')).rejects.toThrowError(
        'This SchemaGenerator instance has not been initialised',
      )
    })

    it('throws if a type could not be found', async () => {
      mockedTsjGenerator.createSchema.mockImplementation(() => {
        throw new NoRootTypeError(randomString('yikes'))
      })

      const schemaGenerator = createSchemaGenerator('', true)
      schemaGenerator.init()

      await expect(schemaGenerator.load('lol')).rejects.toThrowError('Could not find type: lol')
    })

    it('throws if an error occurred while creating a type', async () => {
      mockedTsjGenerator.createSchema.mockImplementation(() => {
        throw new Error(randomString('yikes'))
      })

      const schemaGenerator = createSchemaGenerator('', true)
      schemaGenerator.init()

      await expect(schemaGenerator.load('lol')).rejects.toThrowError(
        'Could not create a schema for type: lol\nyikes',
      )
    })

    it('returns the generated schema', async () => {
      const someSchema = { $schema: 'schema stuff' }
      mockedTsjGenerator.createSchema.mockReturnValue(someSchema)

      const schemaLoader = createSchemaGenerator('tsconfig path', true)
      schemaLoader.init()
      const schema = await schemaLoader.load('DealSchema')

      expect(schema).toEqual(someSchema)
    })

    it('returns cached data for properties that are accessed multiple times', async () => {
      const someSchema = { $schema: 'schema stuff' }
      const someSchema2 = { $schema: 'schema stuff 2' }
      mockedTsjGenerator.createSchema.mockReturnValueOnce(someSchema).mockReturnValueOnce(someSchema2)

      const schemaLoader = createSchemaGenerator('tsconfig path', true)
      schemaLoader.init()
      const schema1 = await schemaLoader.load('DealSchema')
      const schema2 = await schemaLoader.load('DealSchema')

      expect(schema1).toEqual(someSchema)
      expect(mockedTsjGenerator.createSchema).toHaveBeenCalledTimes(1)
      expect(schema2).toEqual(someSchema)
    })
  })
})
