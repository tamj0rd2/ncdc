import { SchemaGenerator } from './schema-generator'
import * as TJS from 'typescript-json-schema'
import * as path from 'path'
import ts from 'typescript'
import { mockObj, randomString } from '~test-helpers'

jest.disableAutomock()
jest.mock('typescript-json-schema')
jest.mock('typescript')
jest.mock('path')
jest.mock('fs')

describe('SchemaLoader', () => {
  const mockedTJS = mockObj(TJS)
  const mockedTJSGenerator = mockObj<TJS.JsonSchemaGenerator>({})
  const mockedTypescript = mockObj(ts)
  const mockedPath = mockObj(path)

  beforeEach(() => {
    jest.resetAllMocks()
    mockedTypescript.readConfigFile.mockReturnValue({ config: {} })
    mockedTypescript.parseJsonConfigFileContent.mockReturnValue(
      mockObj<ts.ParsedCommandLine>({ options: {} }),
    )
    mockedTypescript.createProgram.mockReturnValue(mockObj<ts.Program>({}))
    mockedTJS.buildGenerator.mockReturnValue(mockedTJSGenerator)
  })

  describe('reading the typescript configuration', () => {
    const tsconfigPath = './tsconfig.json'
    it('it calls read config file with the correct args', () => {
      const fullTsPath = randomString() + 'tsconfig.json'
      mockedPath.resolve.mockReturnValue(fullTsPath)

      new SchemaGenerator(tsconfigPath, false).init()

      expect(mockedPath.resolve).toBeCalledWith(tsconfigPath)
      expect(mockedTypescript.readConfigFile).toBeCalledWith(fullTsPath, mockedTypescript.sys.readFile)
    })

    it('throws if there is a config file error', () => {
      mockedTypescript.readConfigFile.mockReturnValue({ error: mockObj<ts.Diagnostic>({ code: 123 }) })

      const generator = new SchemaGenerator('')

      expect(() => generator.init()).toThrowError('Error 123:')
    })

    it('throws if no config file is returned', () => {
      mockedTypescript.readConfigFile.mockReturnValue({})

      const generator = new SchemaGenerator('')

      expect(() => generator.init()).toThrowError('Could not parse the given tsconfig file')
    })

    it('parses the json using the correct args', () => {
      const returnedConfig = mockObj<ts.ParsedCommandLine>({ options: {} })
      mockedTypescript.readConfigFile.mockReturnValue({ config: returnedConfig })
      const tsconfigFolderName = randomString('folder name')
      mockedPath.dirname.mockReturnValue(tsconfigFolderName)
      const fullTsconfigPath = randomString('full tsconfig path')
      mockedPath.resolve.mockReturnValue(fullTsconfigPath)

      new SchemaGenerator('').init()

      expect(mockedTypescript.parseJsonConfigFileContent).toBeCalledWith(
        returnedConfig,
        mockedTypescript.sys,
        tsconfigFolderName,
        {},
        fullTsconfigPath,
      )
    })

    it.each([
      [true, false],
      [false, true],
    ])('creates a ts program using the correct args when incremental is %s', (incremental, noEmit) => {
      mockedTypescript.readConfigFile.mockReturnValue({ config: {} })
      const configFile = mockObj<ts.ParsedCommandLine>({ options: { incremental }, fileNames: ['toad'] })
      mockedTypescript.parseJsonConfigFileContent.mockReturnValue(configFile)

      new SchemaGenerator('').init()

      expect(mockedTypescript.createProgram).toBeCalledWith({
        rootNames: configFile.fileNames,
        options: { ...configFile.options, noEmit },
      })
    })
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
