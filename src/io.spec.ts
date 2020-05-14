import { readFixture } from '~io'
import { randomString, mockObj } from '~test-helpers'
import path from 'path'
import fs from 'fs'

jest.disableAutomock()
jest.mock('path')
jest.mock('fs')

describe('readFixture', () => {
  const mockedFs = mockObj(fs)
  const mockedPath = mockObj(path)
  const basePath = randomString('basePath')

  beforeEach(() => {
    mockedPath.resolve.mockImplementation((...args) => `${basePath}/${args[2]}`)
  })
  afterEach(() => jest.restoreAllMocks())

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
