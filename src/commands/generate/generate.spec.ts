import SchemaGenerator from '../../schema/schema-generator'
import { generate } from './generate'
import * as _fs from 'fs'
import * as _path from 'path'
import { mockObj } from '../../test-helpers'

jest.mock('path')
jest.mock('fs')

describe('Generate', () => {
  const mockSchemaGenerator = mockObj<SchemaGenerator>({ load: jest.fn() })
  const mockFs = mockObj(_fs)
  const mockPath = mockObj(_path)

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('creates the output directory if it does not already exist', async () => {
    mockPath.resolve.mockReturnValue('/abs/path/out')
    mockFs.existsSync.mockReturnValue(false)

    await generate(mockSchemaGenerator, ['Hello', 'World'], './out')

    expect(mockPath.resolve).toHaveBeenCalledWith('./out')
    expect(mockFs.mkdirSync).toHaveBeenCalledWith('/abs/path/out')
  })

  it('does not create an output directory if it already exist', async () => {
    mockFs.existsSync.mockReturnValue(true)

    await generate(mockSchemaGenerator, ['Hello', 'World'], './out')

    expect(mockFs.mkdirSync).not.toHaveBeenCalled()
  })

  it('writes the generated json schema to a file', async () => {
    mockPath.resolve.mockImplementation((...args) => args.join('/'))
    const helloSchema = { $schema: 'Hello' }
    const worldSchema = { $schema: 'World!' }
    mockSchemaGenerator.load.mockResolvedValueOnce(helloSchema).mockResolvedValueOnce(worldSchema)

    await generate(mockSchemaGenerator, ['Hello', 'World'], './out')

    expect(mockSchemaGenerator.load).toHaveBeenNthCalledWith(1, 'Hello')
    expect(mockSchemaGenerator.load).toHaveBeenNthCalledWith(2, 'World')
    expect(mockPath.resolve).toHaveBeenNthCalledWith(2, './out', 'Hello.json')
    expect(mockPath.resolve).toHaveBeenNthCalledWith(3, './out', 'World.json')
    expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2)
  })
})
