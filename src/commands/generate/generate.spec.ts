import { SchemaGenerator } from '~schema'
import { generate } from './generate'
import * as _fs from 'fs'
import * as _path from 'path'
import * as io from '~io'
import { mockObj } from '~test-helpers'

jest.unmock('./generate')
jest.mock('path')
jest.mock('fs')
jest.mock('~io')

describe('Generate', () => {
  const mockSchemaGenerator = mockObj<SchemaGenerator>({ load: jest.fn() })
  const mockFs = mockObj(_fs)
  const mockPath = mockObj(_path)
  const mockedIo = mockObj(io)

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

    expect(mockSchemaGenerator.load).toBeCalledWith('Hello')
    expect(mockSchemaGenerator.load).toBeCalledWith('World')
    expect(mockedIo.writeJsonAsync).toBeCalledWith(helloSchema, './out/Hello.json')
    expect(mockedIo.writeJsonAsync).toBeCalledWith(worldSchema, './out/World.json')
  })
})
