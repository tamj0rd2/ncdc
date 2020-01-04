import readConfigOld, { MockConfig, readConfig, Config, Mode } from './config'
import _jsYaml from 'js-yaml'
import * as _fs from 'fs'
import * as _io from '../io'
import { mockObj } from '../test-helpers'
import * as _request from './request'
import * as _response from './response'

jest.mock('fs')
jest.mock('js-yaml')
jest.mock('../io')
jest.mock('./request')
jest.mock('./response')

const { safeLoad } = mockObj(_jsYaml)
const { readFileAsync } = mockObj(_io)
const { mapTestRequestConfig, mapServeRequestConfig } = mockObj(_request)
const { mapTestResponseConfig, mapServeResponseConfig } = mockObj(_response)

describe('Read config', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('throws for invalid test configs', () => {
    safeLoad.mockReturnValue([
      {
        name: 'A normal blah',
        request: {
          endpoint: '/api/blah',
          hey: 123,
          method: 'u wot',
        },
        response: {
          code: 200,
          type: 'DealSchema',
        },
        woah: {},
      },
    ])

    expect(() => readConfigOld('path')).toThrow()
  })

  it('succeeds for valid test configs', () => {
    const config = [
      {
        name: 'A normal blah',
        request: {
          endpoint: '/api/blah',
          method: 'GET',
        },
        response: {
          code: 200,
          type: 'DealSchema',
        },
      },
    ]
    safeLoad.mockReturnValue(config)

    const result = readConfigOld('path')

    expect(result).toEqual(config)
  })

  it('throws for invalid mock configs', () => {
    safeLoad.mockReturnValue([
      {
        name: 'A normal blah',
        request: {
          endpoint: '/api/blah',
          hey: 123,
          method: 'POST',
        },
        response: {
          code: 200,
          type: 'DealSchema',
        },
        woah: {},
      },
    ])

    expect(() => readConfigOld<MockConfig>('path')).toThrow()
  })

  it('succeeds for valid mock configs', () => {
    const config = [
      {
        name: 'A normal blah',
        request: {
          endpoint: '/api/blah',
          mockEndpoint: '/api/blah/.*',
          method: 'GET',
        },
        response: {
          code: 200,
          type: 'string',
          body: 'swish',
          mockBody: 'Yo',
        },
      },
    ]

    safeLoad.mockReturnValue(config)

    const result = readConfigOld<MockConfig>('path')

    expect(result).toEqual(config)
  })
})

describe('readConfig', () => {
  afterEach(() => jest.resetAllMocks())

  it('calls readFileSync with the correct params', async () => {
    safeLoad.mockReturnValue([])

    await readConfig('./configPath', Mode.Test)

    expect(readFileAsync).toHaveBeenCalledWith('./configPath')
  })

  it('calls safe load with the raw configuration', async () => {
    readFileAsync.mockResolvedValue('hello moto')
    safeLoad.mockReturnValue([])

    await readConfig('path', Mode.Test)

    expect(safeLoad).toHaveBeenCalledWith('hello moto')
  })

  // TODO: populate this once the old stuff has been removed
  it.todo('throws if the config is in the wrong shape')

  it('returns each mapped config', async () => {
    const loadedConfigs = [
      {
        name: 'Yo',
        request: { hello: 'world' },
        response: { goodbye: 'world' },
      },
    ]
    safeLoad.mockReturnValue(loadedConfigs)

    const mappedRequests: Partial<_request.RequestConfig>[] = [{ endpoint: 'yeah' }]
    mapTestRequestConfig.mockResolvedValue(mappedRequests as _request.RequestConfigArray)

    const mappedResponse: _response.ResponseConfig = { code: 200 }
    mapTestResponseConfig.mockResolvedValue(mappedResponse as _response.ResponseConfig)

    const result = await readConfig('path', Mode.Test)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject<Config>({
      name: 'Yo',
      requests: mappedRequests as _request.RequestConfigArray,
      response: mappedResponse,
    })
  })

  describe('request mapping', () => {
    const loadedConfigs = [
      {
        name: 'Yo',
        request: { hello: 'world' },
        response: { goodbye: 'world' },
      },
    ]

    it('calls the test mapper when in test mode', async () => {
      safeLoad.mockReturnValue(loadedConfigs)

      await readConfig('path', Mode.Test)

      expect(mapTestRequestConfig).toHaveBeenCalledTimes(1)
      expect(mapTestRequestConfig).toHaveBeenCalledWith(loadedConfigs[0].request)
    })

    it('calls the serve mapper when in serve mode', async () => {
      safeLoad.mockReturnValue(loadedConfigs)

      await readConfig('path', Mode.Serve)

      expect(mapServeRequestConfig).toHaveBeenCalledTimes(1)
      expect(mapServeRequestConfig).toHaveBeenCalledWith(loadedConfigs[0].request)
    })
  })

  describe('response mapping', () => {
    const loadedConfigs = [
      {
        name: 'Yo',
        request: { hello: 'world' },
        response: { goodbye: 'world' },
      },
    ]

    it('calls the test mapper when in test mode', async () => {
      safeLoad.mockReturnValue(loadedConfigs)

      await readConfig('path', Mode.Test)

      expect(mapTestResponseConfig).toHaveBeenCalledTimes(1)
      expect(mapTestResponseConfig).toHaveBeenCalledWith(loadedConfigs[0].response)
    })

    it('calls the serve mapper when in serve mode', async () => {
      safeLoad.mockReturnValue(loadedConfigs)

      await readConfig('path', Mode.Serve)

      expect(mapServeResponseConfig).toHaveBeenCalledTimes(1)
      expect(mapServeResponseConfig).toHaveBeenCalledWith(loadedConfigs[0].response)
    })
  })
})
