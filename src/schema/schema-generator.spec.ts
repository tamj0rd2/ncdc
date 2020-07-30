import { SchemaGenerator } from './schema-generator'
import ts from 'typescript'
import { mockObj, randomString, mockFn } from '~test-helpers'
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

describe('SchemaLoader', () => {
  const mockedTsj = mockObj(tsj)
  const mockedTsjGenerator = mockObj<tsj.SchemaGenerator>({ createSchema: jest.fn() })
  const mockedTypescript = mockObj(ts)
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
    mockedreportMetric.mockReturnValue(
      mockObj<OperationResult>({ fail: jest.fn(), success: jest.fn() }),
    )
  })

  const createSchemaGenerator = (skipTypeChecking = false): SchemaGenerator => {
    const mockProgram = mockObj<ts.Program>({})
    return new SchemaGenerator(mockProgram, skipTypeChecking, mockedreportMetric, spyLogger)
  }

  describe('loading schemas', () => {
    it('throws if there is no generator', async () => {
      const schemaGenerator = createSchemaGenerator(true)

      await expect(() => schemaGenerator.load('bananas')).rejects.toThrowError(
        'This SchemaGenerator instance has not been initialised',
      )
    })

    it('throws if a type could not be found', async () => {
      mockedTsjGenerator.createSchema.mockImplementation(() => {
        throw new NoRootTypeError(randomString('yikes'))
      })

      const schemaGenerator = createSchemaGenerator(true)
      schemaGenerator.init()

      await expect(schemaGenerator.load('lol')).rejects.toThrowError('Could not find type: lol')
    })

    it('throws if an error occurred while creating a type', async () => {
      mockedTsjGenerator.createSchema.mockImplementation(() => {
        throw new Error(randomString('yikes'))
      })

      const schemaGenerator = createSchemaGenerator(true)
      schemaGenerator.init()

      await expect(schemaGenerator.load('lol')).rejects.toThrowError(
        'Could not create a schema for type: lol\nyikes',
      )
    })

    it('returns the generated schema', async () => {
      const someSchema = { $schema: 'schema stuff' }
      mockedTsjGenerator.createSchema.mockReturnValue(someSchema)

      const schemaLoader = createSchemaGenerator(true)
      schemaLoader.init()
      const schema = await schemaLoader.load('DealSchema')

      expect(schema).toEqual(someSchema)
    })

    it('returns cached data for properties that are accessed multiple times', async () => {
      const someSchema = { $schema: 'schema stuff' }
      const someSchema2 = { $schema: 'schema stuff 2' }
      mockedTsjGenerator.createSchema.mockReturnValueOnce(someSchema).mockReturnValueOnce(someSchema2)

      const schemaLoader = createSchemaGenerator(true)
      schemaLoader.init()
      const schema1 = await schemaLoader.load('DealSchema')
      const schema2 = await schemaLoader.load('DealSchema')

      expect(schema1).toEqual(someSchema)
      expect(mockedTsjGenerator.createSchema).toHaveBeenCalledTimes(1)
      expect(schema2).toEqual(someSchema)
    })
  })
})
