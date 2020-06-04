import { SchemaGenerator } from './schema-generator'
import ts from 'typescript'
import { mockObj, randomString, mockFn } from '~test-helpers'
import * as tsHelpers from './ts-helpers'
import { ReportOperation } from '~commands/shared'
import * as tsj from 'ts-json-schema-generator'
import { NoRootTypeError } from 'ts-json-schema-generator'

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
  const mockedReportOperation = mockFn<ReportOperation>()

  beforeEach(() => {
    jest.resetAllMocks()
    mockedTypescript.parseJsonConfigFileContent.mockReturnValue(
      mockObj<ts.ParsedCommandLine>({ options: {} }),
    )
    mockedTypescript.createProgram.mockReturnValue(mockObj<ts.Program>({}))
    mockedTypescript.getPreEmitDiagnostics.mockReturnValue([])
    mockedTsj.SchemaGenerator.mockImplementation(() => mockedTsjGenerator)
    mockedTsHelpers.readTsConfig.mockReturnValue({} as ts.ParsedCommandLine)
    mockedTsHelpers.formatErrorDiagnostic.mockImplementation(({ messageText }) =>
      typeof messageText === 'string' ? messageText : 'poop',
    )

    mockedReportOperation.mockReturnValue({ fail: jest.fn(), success: jest.fn() })
  })

  describe('when a tsconfig path is given', () => {
    it('throws when there are errors and skipTypeChecking is false', () => {
      mockedTypescript.getPreEmitDiagnostics.mockReturnValue([
        mockObj<ts.Diagnostic>({ messageText: 'woah' }),
      ])

      const schemaLoader = new SchemaGenerator('', false, mockedReportOperation)

      expect(() => schemaLoader.init()).toThrowError('woah')
    })

    it('does not throw when there are no errors and skipTypeChecking is false', () => {
      mockedTypescript.getPreEmitDiagnostics.mockReturnValue([])

      const schemaLoader = new SchemaGenerator('', false, mockedReportOperation)

      expect(() => schemaLoader.init()).not.toThrowError()
    })

    it('does not typecheck if skipTypeChecking is true', () => {
      mockedTypescript.getPreEmitDiagnostics.mockReturnValue([
        mockObj<ts.Diagnostic>({ messageText: 'woah' }),
      ])

      const schemaLoader = new SchemaGenerator('', false, mockedReportOperation)

      expect(mockedTypescript.getPreEmitDiagnostics).not.toBeCalled()
      expect(() => schemaLoader.init()).toThrowError('woah')
    })
  })

  it('calls read ts config with the correct args', () => {
    const tsconfigPath = randomString('tsconfig path')

    new SchemaGenerator(tsconfigPath, false, mockedReportOperation).init()

    expect(mockedTsHelpers.readTsConfig).toBeCalledWith(tsconfigPath)
  })

  describe('loading schemas', () => {
    it('throws if there is no generator', async () => {
      const schemaGenerator = new SchemaGenerator('tsconfig path', true, mockedReportOperation)

      await expect(() => schemaGenerator.load('bananas')).rejects.toThrowError(
        'This SchemaGenerator instance has not been initialised',
      )
    })

    it('throws if a type could not be found', async () => {
      mockedTsjGenerator.createSchema.mockImplementation(() => {
        throw new NoRootTypeError(randomString('yikes'))
      })

      const schemaGenerator = new SchemaGenerator('', true, mockedReportOperation)
      schemaGenerator.init()

      await expect(schemaGenerator.load('lol')).rejects.toThrowError('Could not find type: lol')
    })

    it('throws if an error occurred while creating a type', async () => {
      mockedTsjGenerator.createSchema.mockImplementation(() => {
        throw new Error(randomString('yikes'))
      })

      const schemaGenerator = new SchemaGenerator('', true, mockedReportOperation)
      schemaGenerator.init()

      await expect(schemaGenerator.load('lol')).rejects.toThrowError(
        'Could not create a schema for type: lol\nyikes',
      )
    })

    it('returns the generated schema', async () => {
      const someSchema = { $schema: 'schema stuff' }
      mockedTsjGenerator.createSchema.mockReturnValue(someSchema)

      const schemaLoader = new SchemaGenerator('tsconfig path', true, mockedReportOperation)
      schemaLoader.init()
      const schema = await schemaLoader.load('DealSchema')

      expect(schema).toEqual(someSchema)
    })

    it('returns cached data for properties that are accessed multiple times', async () => {
      const someSchema = { $schema: 'schema stuff' }
      const someSchema2 = { $schema: 'schema stuff 2' }
      mockedTsjGenerator.createSchema.mockReturnValueOnce(someSchema).mockReturnValueOnce(someSchema2)

      const schemaLoader = new SchemaGenerator('tsconfig path', true, mockedReportOperation)
      schemaLoader.init()
      const schema1 = await schemaLoader.load('DealSchema')
      const schema2 = await schemaLoader.load('DealSchema')

      expect(schema1).toEqual(someSchema)
      expect(mockedTsjGenerator.createSchema).toHaveBeenCalledTimes(1)
      expect(schema2).toEqual(someSchema)
    })
  })
})
