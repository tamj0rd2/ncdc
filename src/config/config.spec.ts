import readConfig, { Config, Mode } from './config'
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
        request: { endpoints: ['hello', 'world'] },
        response: { body: 'goodbye' },
      },
    ]

    safeLoad.mockReturnValue(loadedConfigs)
    mapRequestConfig.mockResolvedValue([{} as _request.RequestConfig])

    await readConfig('path', typeValidator, Mode.Test)

    expect(mapRequestConfig).toHaveBeenCalledTimes(1)
    expect(mapRequestConfig).toHaveBeenCalledWith(loadedConfigs[0].request, typeValidator, Mode.Test)
  })

  it('calls the response mapper with the correct args', async () => {
    const loadedConfigs = [
      {
        name: 'Yo',
        request: { endpoints: ['world'] },
        response: { goodbye: 'world' },
      },
    ]

    safeLoad.mockReturnValue(loadedConfigs)
    mapRequestConfig.mockResolvedValue([{} as _request.RequestConfig])

    await readConfig('path', typeValidator, Mode.Serve)

    expect(mapResponseConfig).toHaveBeenCalledTimes(1)
    expect(mapResponseConfig).toHaveBeenCalledWith(loadedConfigs[0].response, typeValidator, Mode.Serve)
  })

  it('returns each mapped config', async () => {
    const loadedConfigs = [
      {
        name: 'Yo',
        request: { endpoints: ['hello', 'world'] },
        response: { body: 'hmm' },
      },
    ]
    safeLoad.mockReturnValue(loadedConfigs)

    const mappedRequests: Partial<_request.RequestConfig>[] = [{ endpoint: 'hello' }, { endpoint: 'world' }]
    mapRequestConfig.mockResolvedValue(mappedRequests as _request.RequestConfigArray)

    const mappedResponse: _response.ResponseConfig = { code: 200 }
    mapResponseConfig.mockResolvedValue(mappedResponse as _response.ResponseConfig)

    const result = await readConfig('path', typeValidator, Mode.Test)

    expect(result).toHaveLength(2)
    expect(result).toMatchObject<Config[]>([
      {
        name: 'Yo [0]',
        request: mappedRequests[0] as _request.RequestConfig,
        response: mappedResponse,
      },
      {
        name: 'Yo [1]',
        request: mappedRequests[1] as _request.RequestConfig,
        response: mappedResponse,
      },
    ])
  })

  describe('test mode specifics', () => {
    it('filters out configs that do not have endpoints', async () => {
      const loadedConfigs = [
        {
          name: 'Yo',
          request: { endpoints: ['/endpoint1', '/endpoint2'] },
          response: { goodbye: 'world' },
        },
        {
          name: 'No',
          request: {},
          response: { goodbye: 'world' },
        },
      ]
      safeLoad.mockReturnValue(loadedConfigs)
      mapRequestConfig.mockResolvedValue([{} as _request.RequestConfig])

      const result = await readConfig('path', typeValidator, Mode.Test)

      expect(mapRequestConfig).toHaveBeenCalledTimes(1)
      expect(mapResponseConfig).toHaveBeenCalledTimes(1)
      expect(result).toHaveLength(1)
    })
  })
})
