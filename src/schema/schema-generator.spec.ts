import SchemaGenerator from './schema-generator'
import * as TJS from 'typescript-json-schema'
import * as path from 'path'
import { mockObj } from '~test-helpers'

// TODO: remove TJS workaround
jest.disableAutomock()
jest.mock('typescript-json-schema')
jest.mock('path')

describe('SchemaLoader', () => {
  const mockedTJS = mockObj(TJS)
  const mockedPath = mockObj(path)

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns the generated schema', async () => {
    const someSchema = { $schema: 'schema stuff' }
    const mockedGenerator: Partial<TJS.JsonSchemaGenerator> = {
      getSchemaForSymbol: jest.fn().mockReturnValue(someSchema),
    }
    mockedTJS.buildGenerator.mockReturnValue(mockedGenerator as TJS.JsonSchemaGenerator)
    mockedPath.resolve.mockImplementation((args) => args)

    const schemaLoader = new SchemaGenerator('tsconfig path', true)
    const schema = await schemaLoader.load('DealSchema')

    expect(TJS.programFromConfig).toHaveBeenCalledWith('tsconfig path')
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
    const schema1 = await schemaLoader.load('DealSchema')
    const schema2 = await schemaLoader.load('DealSchema')

    expect(schema1).toEqual(someSchema)
    expect(mockedGenerator.getSchemaForSymbol).toHaveBeenCalledTimes(1)
    expect(schema2).toEqual(someSchema)
  })

  it('throws an error if a generator is not created', () => {
    mockedTJS.buildGenerator.mockReturnValue(null)

    expect(() => new SchemaGenerator('tsconfig path', true)).toThrow(/Could not build a generator/)
  })
})
