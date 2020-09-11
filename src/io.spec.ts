import { readFixture, readYamlAsync, writeJsonAsync, readJsonAsync, EmptyFileError } from '~io'
import { randomString, mockObj, mocked } from '~test-helpers'
import path, { resolve } from 'path'
import { promises as fsPromises } from 'fs'
import { safeLoad } from 'js-yaml'

jest.disableAutomock()
jest.mock('js-yaml')
jest.mock('path')
jest.mock('fs', () => {
  return {
    promises: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      mkdir: jest.fn(),
    },
  }
})

describe('io', () => {
  const utf8 = 'utf-8'
  const createTestDeps = () => {
    const mockPath = mockObj(path)
    const mockFs = mockObj(fsPromises)
    const mockSafeLoad = mocked(safeLoad)

    return {
      mockPath,
      mockFs,
      mockSafeLoad,
    }
  }

  afterEach(() => jest.resetAllMocks())

  describe('readJsonAsync', () => {
    it('reads the file using the correct args', async () => {
      const { mockFs, mockPath } = createTestDeps()
      const pathSegments = [
        randomString('folder1'),
        randomString('folder2'),
        randomString('fileName', '.json'),
      ]
      const resolvedPath = randomString('resolvedPath')
      mockPath.resolve.mockReturnValueOnce(resolvedPath)
      mockFs.readFile.mockResolvedValue('{}')

      await readJsonAsync(pathSegments[0], pathSegments[1], pathSegments[2])

      expect(mockPath.resolve).toBeCalledWith<Parameters<Resolve>>(...pathSegments)
      expect(mockFs.readFile).toBeCalledWith<Parameters<ReadFile>>(resolvedPath, utf8)
    })
  })

  describe('readYamlAsync', () => {
    beforeEach(() => {
      const { mockFs } = createTestDeps()
      mockFs.readFile.mockResolvedValue(JSON.stringify({ hello: 'world!' }))
    })

    it('reads the file using the correct args', async () => {
      const { mockFs, mockPath, mockSafeLoad } = createTestDeps()
      const filePath = randomString('filePath')
      const resolvedFilePath = randomString('resolvedPath')
      mockPath.resolve.mockReturnValueOnce(resolvedFilePath)
      mockFs.readFile.mockResolvedValueOnce('hello: world')
      mockSafeLoad.mockResolvedValueOnce({})

      await readYamlAsync(filePath)

      expect(mockPath.resolve).toBeCalledWith(filePath)
      expect(mockFs.readFile).toBeCalledWith(resolvedFilePath, utf8)
      expect(mockSafeLoad).toBeCalledWith<Parameters<SafeLoad>>('hello: world')
    })

    it('returns some json', async () => {
      const { mockSafeLoad } = createTestDeps()
      const expectedData = { hello: 'world' }
      mockSafeLoad.mockResolvedValueOnce(expectedData)

      const data = await readYamlAsync(randomString('filePath'))

      expect(data).toBe(expectedData)
    })

    it('throws if the loaded file is empty', async () => {
      const { mockSafeLoad } = createTestDeps()
      mockSafeLoad.mockResolvedValueOnce(undefined)

      await expect(readYamlAsync(randomString('filePath'))).rejects.toThrowError(EmptyFileError)
    })
  })

  describe('writeJsonAsync', () => {
    it('creates a folder for the file', async () => {
      const { mockFs, mockPath } = createTestDeps()
      const filePath = randomString('filePath')
      const resolvedFilePath = randomString('resolvedFilePath')
      const folderPath = randomString('folderPath')
      mockPath.resolve.mockReturnValueOnce(resolvedFilePath)
      mockPath.dirname.mockReturnValueOnce(folderPath)

      await writeJsonAsync({}, filePath)

      expect(mockPath.resolve).toBeCalledWith<Parameters<Resolve>>(filePath)
      expect(mockPath.dirname).toBeCalledWith<Parameters<Dirname>>(resolvedFilePath)
      expect(mockFs.mkdir).toBeCalledWith<Parameters<Mkdir>>(folderPath, { recursive: true })
    })

    it('writes the json to disk', async () => {
      const { mockFs, mockPath } = createTestDeps()
      const filePath = randomString('filePath')
      const resolvedFilePath = randomString('resolvedFilePath')
      mockPath.resolve.mockReturnValueOnce(resolvedFilePath)

      const data = { hello: 'world' }
      await writeJsonAsync(data, filePath)

      expect(mockPath.resolve).toBeCalledWith<Parameters<Resolve>>(filePath)
      expect(mockFs.writeFile).toBeCalledWith<Parameters<WriteFile>>(
        resolvedFilePath,
        JSON.stringify(data, undefined, 2),
      )
    })
  })

  describe('readFixture', () => {
    const basePath = randomString('basePath')

    it('calls readFile with the correct args when fixture path is absolute', async () => {
      const { mockFs, mockPath } = createTestDeps()
      mockPath.isAbsolute.mockReturnValueOnce(true)
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ hello: 'world!' }))

      const fixturePath = randomString('fixturePath')
      await readFixture(basePath, fixturePath)

      expect(mockPath.resolve).not.toBeCalled()
      expect(mockFs.readFile).toBeCalledWith(fixturePath, utf8)
    })

    it('calls readFile with the correct args when fixture path is relative', async () => {
      const { mockFs, mockPath } = createTestDeps()
      const resolvedFixturePath = randomString('resolvedFixturePath')
      mockPath.isAbsolute.mockReturnValueOnce(false)
      mockPath.resolve.mockReturnValueOnce(resolvedFixturePath)
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ hello: 'world!' }))

      const fixturePath = randomString('fixturePath')
      await readFixture(basePath, fixturePath)

      expect(mockPath.resolve).toBeCalledWith(basePath, '..', fixturePath)
      expect(mockFs.readFile).toBeCalledWith(resolvedFixturePath, utf8)
    })

    it('returns json when the fixture extension is .json', async () => {
      const { mockFs } = createTestDeps()
      const fixturePath = randomString('fixturePath') + '.json'
      const expectedData = { hello: 'world' }
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(expectedData))

      const result = await readFixture(basePath, fixturePath)

      expect(result).toEqual(expectedData)
    })

    it.each([['.yml'], ['.yaml']])(
      'returns a json version of the document when the extension is %s',
      async (ext) => {
        const { mockSafeLoad } = createTestDeps()
        const fixturePath = randomString() + ext
        const expectedData = { goodbye: 'world' }
        mockSafeLoad.mockResolvedValue(expectedData)

        const result = await readFixture(basePath, fixturePath)

        expect(result).toEqual(expectedData)
      },
    )

    it('returns plain text when the filepath ends with anything else', async () => {
      const { mockFs } = createTestDeps()
      const fixturePath = randomString()
      mockFs.readFile.mockResolvedValue('goodbye: world')

      const result = await readFixture(basePath, fixturePath)

      expect(result).toEqual('goodbye: world')
    })
  })
})

type Resolve = typeof resolve
type Dirname = typeof resolve
type Mkdir = typeof fsPromises['mkdir']
type WriteFile = typeof fsPromises['writeFile']
type ReadFile = typeof fsPromises['readFile']
type SafeLoad = typeof safeLoad
