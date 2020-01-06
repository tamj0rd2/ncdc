import { createGetBodyToUse, GetBodyToUse } from './body'
import * as _io from '~io'
import * as _path from 'path'
import { mockObj } from '~test-helpers'

jest.mock('~io')
jest.mock('path')

describe('get body to use', () => {
  const { readJsonAsync } = mockObj(_io)
  const { resolve } = mockObj(_path)
  let getBodyToUse: GetBodyToUse

  beforeEach(() => {
    getBodyToUse = createGetBodyToUse('some path')
    resolve.mockImplementation((...args) => args[1])
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('returns body when supplied', async () => {
    const bodyConfig = {
      body: 'swag, blaze it',
    }

    const body = await getBodyToUse(bodyConfig)

    expect(body).toEqual('swag, blaze it')
  })

  it('maps bodyPath to body when supplied', async () => {
    const bodyConfig = {
      code: 200,
      bodyPath: './response.json',
    }
    readJsonAsync.mockResolvedValue('the body')

    const body = await getBodyToUse(bodyConfig)

    expect(resolve).toHaveBeenCalledWith('some path', '..', './response.json')
    expect(body).toEqual('the body')
  })

  it('maps serveBody to body when supplied', async () => {
    const bodyConfig = {
      code: 200,
      serveBody: 'woah son',
    }
    const body = await getBodyToUse(bodyConfig)

    expect(body).toEqual('woah son')
  })

  it('maps serveBodyPath to body when supplied', async () => {
    const bodyConfig = {
      code: 200,
      serveBodyPath: './response.json',
    }
    readJsonAsync.mockResolvedValue('the body')

    const body = await getBodyToUse(bodyConfig)

    expect(resolve).toHaveBeenCalledWith('some path', '..', './response.json')
    expect(body).toEqual('the body')
  })
})
