import readConfigOld, { MockConfig, readConfig, Config, Mode, readGenerateConfig } from './config'
import _jsYaml from 'js-yaml'
import * as _io from '../io'
import { mockObj } from '../test-helpers'
import * as _request from './request'
import * as _response from './response'
import TypeValidator from '../validation/type-validator'

jest.mock('fs')
jest.mock('js-yaml')
jest.mock('../io')
jest.mock('./request')
jest.mock('./response')
jest.mock('../validation/type-validator')

const { safeLoad } = mockObj(_jsYaml)
const { readFileAsync } = mockObj(_io)
const { mapRequestConfig } = mockObj(_request)
const { mapResponseConfig } = mockObj(_response)
const typeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })

describe('Read config old', () => {
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

    await readConfig('./configPath', typeValidator, Mode.Test)

    expect(readFileAsync).toHaveBeenCalledWith('./configPath')
  })

  it('calls safe load with the raw configuration', async () => {
    readFileAsync.mockResolvedValue('hello moto')
    safeLoad.mockReturnValue([])

    await readConfig('path', typeValidator, Mode.Test)

    expect(safeLoad).toHaveBeenCalledWith('hello moto')
  })

  // TODO: populate this once the old stuff has been removed
  it.todo('throws if the config is in the wrong shape')

  it('calls the request mapper with the correct args', async () => {
    const loadedConfigs = [
      {
        name: 'Yo',
        request: { hello: 'world' },
        response: { goodbye: 'world' },
      },
    ]

    safeLoad.mockReturnValue(loadedConfigs)

    await readConfig('path', typeValidator, Mode.Test)

    expect(mapRequestConfig).toHaveBeenCalledTimes(1)
    expect(mapRequestConfig).toHaveBeenCalledWith(loadedConfigs[0].request, typeValidator, Mode.Test)
  })

  it('calls the response mapper with the correct args', async () => {
    const loadedConfigs = [
      {
        name: 'Yo',
        request: { hello: 'world' },
        response: { goodbye: 'world' },
      },
    ]

    safeLoad.mockReturnValue(loadedConfigs)

    await readConfig('path', typeValidator, Mode.Serve)

    expect(mapResponseConfig).toHaveBeenCalledTimes(1)
    expect(mapResponseConfig).toHaveBeenCalledWith(loadedConfigs[0].response, typeValidator, Mode.Serve)
  })

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
    mapRequestConfig.mockResolvedValue(mappedRequests as _request.RequestConfigArray)

    const mappedResponse: _response.ResponseConfig = { code: 200 }
    mapResponseConfig.mockResolvedValue(mappedResponse as _response.ResponseConfig)

    const result = await readConfig('path', typeValidator, Mode.Test)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject<Config>({
      name: 'Yo',
      requests: mappedRequests as _request.RequestConfigArray,
      response: mappedResponse,
    })
  })
})

describe('readGenerateConfig', () => {
  afterEach(() => jest.resetAllMocks())

  it('calls readFileSync with the correct params', async () => {
    safeLoad.mockReturnValue([])

    await readConfig('./configPath', typeValidator, Mode.Test)

    expect(readFileAsync).toHaveBeenCalledWith('./configPath')
  })

  it('calls safe load with the raw configuration', async () => {
    readFileAsync.mockResolvedValue('hello moto')
    safeLoad.mockReturnValue([])

    await readConfig('path', typeValidator, Mode.Test)

    expect(safeLoad).toHaveBeenCalledWith('hello moto')
  })

  // TODO: populate this once the old stuff has been removed
  it.todo('throws if the config is in the wrong shape')

  it('returns each mapped config', async () => {
    const loadedConfigs = [
      {
        name: 'Yo',
        request: { type: 'hey' },
        response: { type: 'bay' },
      },
    ]
    safeLoad.mockReturnValue(loadedConfigs)

    const result = await readGenerateConfig('path')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'Yo',
      request: { type: 'hey' },
      response: { type: 'bay' },
    })
  })
})
