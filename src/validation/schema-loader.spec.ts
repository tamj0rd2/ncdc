import SchemaGenerator from './schema-loader'
import * as TJS from 'typescript-json-schema'
import { mockedObj } from '../test-helpers'
import Logger from '../logger'
import * as path from 'path'

jest.mock('typescript-json-schema')
jest.mock('path')

describe('SchemaLoader', () => {
  const mockedTJS = mockedObj(TJS)
  const mockedPath = mockedObj(path)

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns the generated schema', () => {
    const someSchema = { $schema: 'schema stuff' }
    const mockedGenerator: Partial<TJS.JsonSchemaGenerator> = {
      getSchemaForSymbol: jest.fn().mockReturnValue(someSchema),
    }
    mockedTJS.buildGenerator.mockReturnValue(mockedGenerator as TJS.JsonSchemaGenerator)
    mockedPath.resolve.mockImplementation(args => args)
    const mockLogger = mockedObj<Logger>({})

    const schemaLoader = new SchemaGenerator('tsconfig path', mockLogger)
    const schema = schemaLoader.load('DealSchema')

    expect(TJS.programFromConfig).toHaveBeenCalledWith('tsconfig path')
    expect(schema).toEqual(someSchema)
  })

  it('returns cached data for properties that are accessed multiple times', () => {
    const someSchema = { $schema: 'schema stuff' }
    const someSchema2 = { $schema: 'schema stuff 2' }
    const mockedGenerator: Partial<TJS.JsonSchemaGenerator> = {
      getSchemaForSymbol: jest
        .fn()
        .mockReturnValueOnce(someSchema)
        .mockReturnValueOnce(someSchema2),
    }
    mockedTJS.buildGenerator.mockReturnValue(mockedGenerator as TJS.JsonSchemaGenerator)
    const mockLogger = mockedObj<Logger>({})

    const schemaLoader = new SchemaGenerator('tsconfig path', mockLogger)
    const schema1 = schemaLoader.load('DealSchema')
    const schema2 = schemaLoader.load('DealSchema')

    expect(schema1).toEqual(someSchema)
    expect(mockedGenerator.getSchemaForSymbol).toHaveBeenCalledTimes(1)
    expect(schema2).toEqual(someSchema)
  })
})
