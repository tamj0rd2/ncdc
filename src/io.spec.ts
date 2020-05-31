import { readFixture, readYamlAsync, writeJsonAsync } from '~io'
import { randomString, mockObj } from '~test-helpers'
import path from 'path'
import fs from 'fs'

jest.disableAutomock()
jest.mock('path')
jest.mock('fs')

const mockedFs = mockObj(fs)
const mockedPath = mockObj(path)

const basePath = randomString('basePath')
beforeEach(() => {
  mockedPath.resolve.mockImplementation((...args) => `${basePath}/${args[2]}`)
})
afterEach(() => jest.resetAllMocks())

describe('readFixture', () => {
  it.each([['.json'], ['.txt'], ['.yml'], ['.yaml']])(
    'calls readFile with the correct args when the path is absolute and the extension is %s',
    async (extension) => {
      mockedPath.isAbsolute.mockReturnValue(true)
      mockedFs.readFile.mockImplementation((path, cb) => {
        cb(null, Buffer.from(JSON.stringify({ hello: 'world!' })))
      })
      const fixturePath = randomString() + extension

      await readFixture(basePath, fixturePath)

      expect(mockedFs.readFile).toBeCalledWith(fixturePath, expect.any(Function))
    },
  )

  it.each([['.json'], ['.txt'], ['.yml'], ['.yaml']])(
    'calls readFile with the correct args when the path is not absolute and the extension is %s',
    async (extension) => {
      mockedPath.isAbsolute.mockReturnValue(false)
      mockedFs.readFile.mockImplementation((path, cb) => {
        cb(null, Buffer.from(JSON.stringify({ hello: 'world!' })))
      })
      const fixturePath = randomString() + extension

      await readFixture(basePath, fixturePath)

      expect(mockedFs.readFile).toBeCalledWith(`${basePath}/${fixturePath}`, expect.any(Function))
    },
  )

  it('returns the json when the fixture extension is .json', async () => {
    const fixturePath = randomString() + '.json'
    mockedFs.readFile.mockImplementation((path, cb) => {
      cb(null, Buffer.from(JSON.stringify({ hello: 'world!' })))
    })

    const result = await readFixture(basePath, fixturePath)

    expect(result).toEqual({
      hello: 'world!',
    })
  })

  it.each([['.yml'], ['.yaml']])(
    'returns a json version of the document when the extension is %s',
    async (ext) => {
      const fixturePath = randomString() + ext
      mockedFs.readFile.mockImplementation((path, cb) => {
        cb(null, Buffer.from('goodbye: world'))
      })

      const result = await readFixture(basePath, fixturePath)

      expect(result).toEqual({
        goodbye: 'world',
      })
    },
  )

  it('returns plain text when the filepath ends with anything else', async () => {
    const fixturePath = randomString()
    mockedFs.readFile.mockImplementation((path, cb) => {
      cb(null, Buffer.from('goodbye: world'))
    })

    const result = await readFixture(basePath, fixturePath)

    expect(result).toEqual('goodbye: world')
  })
})

describe('readYamlAsync', () => {
  beforeEach(() => {
    mockedFs.readFile.mockImplementation((_, cb) => {
      cb(null, Buffer.from(JSON.stringify({ hello: 'world!' })))
    })
  })

  it('resolves the path when the resolvePath arg is true', async () => {
    const filePath = randomString('path')
    const resolvedPath = 'I resolved lol'
    mockedPath.resolve.mockReturnValue(resolvedPath)

    await readYamlAsync(filePath, true)

    expect(mockedPath.resolve).toBeCalledWith(filePath)
    expect(mockedFs.readFile).toBeCalledWith(resolvedPath, expect.any(Function))
  })

  it('uses the given path when resolvePath is false', async () => {
    const filePath = randomString('path')

    await readYamlAsync(filePath, false)

    expect(mockedFs.readFile).toBeCalledWith(filePath, expect.any(Function))
  })
})

describe('writeJsonAsync', () => {
  it('rejects if there is a problem writing the file', async () => {
    const err = mockObj<NodeJS.ErrnoException>({ message: 'whoops' })

    mockedFs.writeFile.mockImplementation((path, data, cb) => cb(err))

    await expect(writeJsonAsync({}, randomString('path'))).rejects.toBe(err)
  })
})
