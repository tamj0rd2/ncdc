import { SchemaGenerator } from './schema-generator'
import ts from 'typescript'
import { mockObj, randomString, mockCtor } from '~test-helpers'
import * as tsj from 'ts-json-schema-generator'
import { NoRootTypeError } from 'ts-json-schema-generator'

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

      await expect(() => schemaGenerator.load('bananas')).rejects.toThrowError(
        'This SchemaGenerator instance has not been initialised',
      )
    })

    it('throws if a type could not be found', async () => {
      const { schemaGenerator, mockedTsjGenerator } = createTestDeps()
      mockedTsjGenerator.createSchema.mockImplementation(() => {
        throw new NoRootTypeError(randomString('yikes'))
      })
      schemaGenerator.init()

      await expect(schemaGenerator.load('lol')).rejects.toThrowError('Could not find type: lol')
    })

    it('throws if an error occurred while creating a type', async () => {
      const { schemaGenerator, mockedTsjGenerator } = createTestDeps()
      mockedTsjGenerator.createSchema.mockImplementation(() => {
        throw new Error(randomString('yikes'))
      })

      schemaGenerator.init()

      await expect(schemaGenerator.load('lol')).rejects.toThrowError(
        'Could not create a schema for type: lol\nyikes',
      )
    })

    it('returns the generated schema', async () => {
      const { schemaGenerator, mockedTsjGenerator } = createTestDeps()
      const someSchema = { $schema: 'schema stuff' }
      mockedTsjGenerator.createSchema.mockReturnValue(someSchema)

      schemaGenerator.init()
      const schema = await schemaGenerator.load('DealSchema')

      expect(schema).toEqual(someSchema)
    })

    it('returns cached data for properties that are accessed multiple times', async () => {
      const { schemaGenerator, mockedTsjGenerator } = createTestDeps()
      const someSchema = { $schema: 'schema stuff' }
      const someSchema2 = { $schema: 'schema stuff 2' }
      mockedTsjGenerator.createSchema.mockReturnValueOnce(someSchema).mockReturnValueOnce(someSchema2)

      schemaGenerator.init()
      const schema1 = await schemaGenerator.load('DealSchema')
      const schema2 = await schemaGenerator.load('DealSchema')

      expect(schema1).toEqual(someSchema)
      expect(mockedTsjGenerator.createSchema).toHaveBeenCalledTimes(1)
      expect(schema2).toEqual(someSchema)
    })
  })
})
