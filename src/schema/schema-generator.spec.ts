import { SchemaGenerator } from './schema-generator'
import ts from 'typescript'
import { mockObj, randomString, mockCtor } from '~test-helpers'
import * as tsj from 'ts-json-schema-generator'
import { NoRootTypeError } from 'ts-json-schema-generator'
import { Type } from '~config/resource/type'
import { TypeBuilder } from '~config/resource/builders'

jest.disableAutomock()
jest.mock('ts-json-schema-generator')

describe('SchemaLoader', () => {
  const createTestDeps = () => {
    const mockedTsjGenerator = mockObj<tsj.SchemaGenerator>({ createSchema: jest.fn() })
    mockCtor(tsj.SchemaGenerator).mockImplementation(() => mockedTsjGenerator)
    const dummyProgram: ts.Program = mockObj<ts.Program>({})

    return {
      mockedTsjGenerator,
      schemaGenerator: new SchemaGenerator(dummyProgram),
    }
  }

  afterEach(() => jest.resetAllMocks())

  describe('load', () => {
    it('throws if it has not been instantiated', async () => {
      const { schemaGenerator } = createTestDeps()

      await expect(() => schemaGenerator.load(TypeBuilder.random())).rejects.toThrowError(
        'This SchemaGenerator instance has not been initialised',
      )
    })

    it('throws if a type could not be found', async () => {
      const { schemaGenerator, mockedTsjGenerator } = createTestDeps()
      mockedTsjGenerator.createSchema.mockImplementation(() => {
        throw new NoRootTypeError(randomString('yikes'))
      })
      schemaGenerator.init()

      await expect(schemaGenerator.load(new Type('lol'))).rejects.toThrowError('Could not find type: lol')
    })

    it('throws if an error occurred while creating a type', async () => {
      const { schemaGenerator, mockedTsjGenerator } = createTestDeps()
      mockedTsjGenerator.createSchema.mockImplementation(() => {
        throw new Error(randomString('yikes'))
      })

      schemaGenerator.init()

      await expect(schemaGenerator.load(new Type('lol'))).rejects.toThrowError(
        'Could not create a schema for type: lol\nyikes',
      )
    })

    it('returns the generated schema', async () => {
      const { schemaGenerator, mockedTsjGenerator } = createTestDeps()
      const someSchema = { $schema: 'schema stuff' }
      mockedTsjGenerator.createSchema.mockReturnValue(someSchema)

      schemaGenerator.init()
      const schema = await schemaGenerator.load(TypeBuilder.random())

      expect(schema).toEqual(someSchema)
    })

    it('returns cached data for types that are loaded more than once', async () => {
      const { schemaGenerator, mockedTsjGenerator } = createTestDeps()
      const someSchema = { $schema: 'schema stuff' }
      mockedTsjGenerator.createSchema.mockReturnValueOnce(someSchema)
      const type = TypeBuilder.random()

      schemaGenerator.init()
      const schema1 = await schemaGenerator.load(type)
      const schema2 = await schemaGenerator.load(type)

      expect(schema1).toEqual(someSchema)
      expect(mockedTsjGenerator.createSchema).toHaveBeenCalledTimes(1)
      expect(schema2).toEqual(someSchema)
    })
  })
})
