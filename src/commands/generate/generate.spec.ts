import { SchemaGenerator } from '~schema'
import { generate } from './generate'
import * as io from '~io'
import { mockObj, randomString } from '~test-helpers'
import { JSONSchema7 } from 'json-schema'

jest.disableAutomock()
jest.mock('~io')

describe('Generate', () => {
  function createTestDeps() {
    const mockSchemaGenerator = mockObj<SchemaGenerator>({ load: jest.fn() })
    const mockedIo = mockObj(io)
    return {
      mockSchemaGenerator,
      mockedIo,
      generate,
    }
  }

  afterEach(() => jest.resetAllMocks())

  it('loads a schema for each type', async () => {
    const { generate, mockSchemaGenerator } = createTestDeps()
    const types = [randomString('type1'), randomString('type2')]

    await generate(mockSchemaGenerator, types, './out')

    expect(mockSchemaGenerator.load).toHaveBeenNthCalledWith(1, types[0])
    expect(mockSchemaGenerator.load).toHaveBeenNthCalledWith(2, types[1])
  })

  it('writes each generated json schema to disk', async () => {
    const { generate, mockSchemaGenerator, mockedIo } = createTestDeps()
    const types = [randomString('type1'), randomString('type2')]
    const schema1 = mockObj<JSONSchema7>({ title: 'schema1' })
    const schema2 = mockObj<JSONSchema7>({ title: 'schema2' })
    mockSchemaGenerator.load.mockResolvedValueOnce(schema1).mockResolvedValueOnce(schema2)

    await generate(mockSchemaGenerator, types, './out')

    expect(mockedIo.writeJsonAsync).toBeCalledWith(schema1, `./out/${types[0]}.json`)
    expect(mockedIo.writeJsonAsync).toBeCalledWith(schema2, `./out/${types[1]}.json`)
  })
})
