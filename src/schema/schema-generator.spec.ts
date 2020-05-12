import { SchemaGenerator } from './schema-generator'
import * as TJS from 'typescript-json-schema'
import ts from 'typescript'
import { mockObj, randomString } from '~test-helpers'
import * as tsHelpers from './ts-helpers'

jest.disableAutomock()
jest.mock('typescript-json-schema')
jest.mock('typescript')
jest.mock('path')
jest.mock('fs')
jest.mock('./ts-helpers')

describe('SchemaLoader', () => {
  const mockedTJS = mockObj(TJS)
  const mockedTJSGenerator = mockObj<TJS.JsonSchemaGenerator>({})
  const mockedTypescript = mockObj(ts)
  const mockedTsHelpers = mockObj(tsHelpers)

  beforeEach(() => {
    jest.resetAllMocks()
    mockedTypescript.parseJsonConfigFileContent.mockReturnValue(
      mockObj<ts.ParsedCommandLine>({ options: {} }),
    )
    mockedTypescript.createProgram.mockReturnValue(mockObj<ts.Program>({}))
    mockedTJS.buildGenerator.mockReturnValue(mockedTJSGenerator)
    mockedTsHelpers.readTsConfig.mockReturnValue({} as ts.ParsedCommandLine)
  })

  it('calls read ts config with the correct args', () => {
    const tsconfigPath = randomString('tsconfig path')

    new SchemaGenerator(tsconfigPath).init()

    expect(mockedTsHelpers.readTsConfig).toBeCalledWith(tsconfigPath)
  })

  describe('creating a tsj generator', () => {
    it.each([[false], [true]])('creates a generator with the correct args when force is %s', (force) => {
      const dummyProgram = mockObj<ts.Program>({})
      mockedTypescript.createProgram.mockReturnValue(dummyProgram)

      new SchemaGenerator('', force).init()

      expect(mockedTJS.buildGenerator).toBeCalledWith(dummyProgram, { required: true, ignoreErrors: force })
    })

    it('throws an error if no generator is returned', () => {
      mockedTJS.buildGenerator.mockReturnValue(null)

      const schemaLoader = new SchemaGenerator('tsconfig path', true)

      expect(() => schemaLoader.init()).toThrowError('Could not build a generator')
    })
  })

  describe('loading schemas', () => {
    it('throws if there is no generator', async () => {
      const schemaGenerator = new SchemaGenerator('tsconfig path', true)

      await expect(() => schemaGenerator.load('bananas')).rejects.toThrowError(
        'No schema generator has been initialised',
      )
    })

    it('returns the generated schema', async () => {
      const someSchema = { $schema: 'schema stuff' }
      const mockedGenerator: Partial<TJS.JsonSchemaGenerator> = {
        getSchemaForSymbol: jest.fn().mockReturnValue(someSchema),
      }
      mockedTJS.buildGenerator.mockReturnValue(mockedGenerator as TJS.JsonSchemaGenerator)

      const schemaLoader = new SchemaGenerator('tsconfig path', true)
      schemaLoader.init()
      const schema = await schemaLoader.load('DealSchema')

      expect(schema).toEqual(someSchema)
    })

    it('returns cached data for properties that are accessed multiple times', async () => {
      const someSchema = { $schema: 'schema stuff' }
      const someSchema2 = { $schema: 'schema stuff 2' }
      const mockedGenerator: Partial<TJS.JsonSchemaGenerator> = {
        getSchemaForSymbol: jest.fn().mockReturnValueOnce(someSchema).mockReturnValueOnce(someSchema2),
      }
      mockedTJS.buildGenerator.mockReturnValue(mockedGenerator as TJS.JsonSchemaGenerator)

      const schemaLoader = new SchemaGenerator('tsconfig path', true)
      schemaLoader.init()
      const schema1 = await schemaLoader.load('DealSchema')
      const schema2 = await schemaLoader.load('DealSchema')

      expect(schema1).toEqual(someSchema)
      expect(mockedGenerator.getSchemaForSymbol).toHaveBeenCalledTimes(1)
      expect(schema2).toEqual(someSchema)
    })
  })
})
