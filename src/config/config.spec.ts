import readConfig, { Config } from './config'
import _jsYaml from 'js-yaml'
import * as _io from '~io'
import { mockObj, mockFn } from '~test-helpers'
import * as _request from './request'
import * as _response from './response'
import * as _body from './body'
import { TypeValidator } from '~validation'
import { Mode } from './types'
import { number, object } from 'yup'

// TODO: fix this yup workaround
jest.disableAutomock()
jest.mock('fs')
jest.mock('./request')
jest.mock('./response')
jest.mock('./body')
jest.mock('js-yaml')
jest.mock('~validation')
jest.mock('~io')

describe('readConfig', () => {
  const { safeLoad } = mockObj(_jsYaml)
  const { readFileAsync } = mockObj(_io)
  const { mapRequestConfig, getTestSchema, getServeSchema } = mockObj(_request)
  const { mapResponseConfig } = mockObj(_response)
  const typeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })
  const { createGetBodyToUse } = mockObj(_body)
  const getBodyToUse = mockFn<_body.GetBodyToUse>()

  beforeEach(() => {
    createGetBodyToUse.mockReturnValue(getBodyToUse)
    // TODO: would be cool to fix these not to use any
    getTestSchema.mockReturnValue({ required: jest.fn(() => ({ resolve: jest.fn() })) } as any)
    getServeSchema.mockReturnValue({ required: jest.fn(() => ({ resolve: jest.fn() })) } as any)

    mapRequestConfig.mockResolvedValue([{} as _request.RequestConfig])
    mapResponseConfig.mockResolvedValue({} as _response.ResponseConfig)
  })

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

  it('throws if the config is in the wrong shape', async () => {
    safeLoad.mockReturnValue([{ poop: ':O' }])

    await expect(readConfig('path', typeValidator, Mode.Test)).rejects.toThrowError()
  })

  it('calls create get body to use with the correct args', async () => {
    safeLoad.mockReturnValue([])

    await readConfig('./crazy-config.yml', typeValidator, Mode.Test)

    expect(createGetBodyToUse).toHaveBeenCalledWith('./crazy-config.yml')
  })

  it('calls the request mapper with the correct args', async () => {
    const loadedConfigs = [
      {
        name: 'Yo',
        request: { endpoints: ['hello', 'world'] },
        response: { body: 'goodbye' },
      },
    ]

    safeLoad.mockReturnValue(loadedConfigs)

    await readConfig('path', typeValidator, Mode.Test)

    expect(mapRequestConfig).toHaveBeenCalledTimes(1)
    expect(mapRequestConfig).toHaveBeenCalledWith(loadedConfigs[0].request, typeValidator, getBodyToUse)
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
    expect(mapResponseConfig).toHaveBeenCalledWith(loadedConfigs[0].response, typeValidator, getBodyToUse)
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
    it('filters out configs that are serve only', async () => {
      const loadedConfigs = [
        {
          name: 'Yo',
          request: { endpoints: ['/endpoint1', '/endpoint2'] },
          response: { goodbye: 'world' },
        },
        {
          name: 'No',
          serveOnly: true,
          request: { bizarre: 'yo' },
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

    it('does not throw when serveOnly is false and request has endpoints', async () => {
      const rawConfig = {
        name: '1',
        serveOnly: false,
        request: {
          method: 'GET',
          endpoints: 'endpoint1',
        },
        response: {
          code: 200,
        },
      }

      getTestSchema.mockImplementation(serveOnly => (!serveOnly ? object() : number()) as any)

      safeLoad.mockReturnValue([rawConfig])
      mapRequestConfig.mockResolvedValue([rawConfig as any])

      await expect(readConfig('path', typeValidator, Mode.Test)).resolves.not.toThrowError()
    })

    it('throws when serveOnly is false and request has no endpoints', async () => {
      const rawConfig = {
        name: '1',
        serveOnly: false,
        request: {
          method: 'GET',
        },
        response: {
          code: 200,
        },
      }

      getTestSchema.mockImplementation(serveOnly => (serveOnly ? object() : number()) as any)

      safeLoad.mockReturnValue([rawConfig])
      mapRequestConfig.mockResolvedValue([rawConfig as any])

      await expect(readConfig('path', typeValidator, Mode.Test)).rejects.toThrowError(
        "schema's of different types",
      )
    })
  })
})
