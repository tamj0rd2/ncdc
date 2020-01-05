import { RequestConfig, mapRequestConfig } from './request'
import * as _io from '../io'
import { mockObj } from '../test-helpers'
import TypeValidator from '../validation/type-validator'
import Problem, { ProblemType } from '../problem'
import { Mode } from './config'

jest.mock('../io')

describe('mapRequestConfig', () => {
  const { readJsonAsync } = mockObj(_io)
  const typeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })

  afterEach(() => jest.resetAllMocks())

  const basicMappingCases: [Mode.Serve | Mode.Test][] = [[Mode.Test], [Mode.Serve]]
  it.each(basicMappingCases)('maps a basic %s config correctly', async mode => {
    const rawConfig = {
      method: 'GET',
      endpoints: ['/endpoint1', '/endpoint2'],
      type: 'MyType',
      body: 'silly',
      headers: { header1: 'yo' },
    }

    const expected: RequestConfig[] = [
      {
        method: 'GET',
        endpoint: '/endpoint1',
        type: 'MyType',
        body: 'silly',
        headers: { header1: 'yo' },
      },
      {
        method: 'GET',
        endpoint: '/endpoint2',
        type: 'MyType',
        body: 'silly',
        headers: { header1: 'yo' },
      },
    ]

    await expect(mapRequestConfig(rawConfig, typeValidator, mode)).resolves.toMatchObject(expected)
  })

  const combinedConfigCases: [object][] = [
    [
      {
        method: 'GET',
        endpoints: ['/endpoint1'],
        type: 'object',
        bodyPath: './request.json',
        serveEndpoint: '/serve-endpoint',
      },
    ],
    [
      {
        method: 'GET',
        endpoints: ['/endpoint1', '/spice-it-up'],
        type: 'object',
        serveBody: ':D',
        serveEndpoint: '/serve-endpoint',
      },
    ],
    [
      {
        method: 'GET',
        endpoints: ['/endpoint1'],
        type: 'object',
        serveBodyPath: './request.json',
        serveEndpoint: '/serve-endpoint',
      },
    ],
  ]

  it.each(combinedConfigCases)(
    'does not throw for config that contains test settings',
    async combinedConfig => {
      await expect(mapRequestConfig(combinedConfig, typeValidator, Mode.Test)).resolves.not.toThrowError()
      await expect(mapRequestConfig(combinedConfig, typeValidator, Mode.Serve)).resolves.not.toThrowError()
    },
  )

  it('maps body when a bodyPath is given', async () => {
    const rawConfig = {
      method: 'GET',
      endpoints: ['/endpoint1'],
      type: 'MyType',
      bodyPath: './silly.json',
    }

    readJsonAsync.mockResolvedValue({ silly: 'billy' })

    const mappedConfig = (await mapRequestConfig(rawConfig, typeValidator, Mode.Serve))[0]

    expect(readJsonAsync).toHaveBeenCalledWith('./silly.json')
    expect(mappedConfig.body).toStrictEqual({ silly: 'billy' })
  })

  describe('when a body and type are both given', () => {
    it('calls the type validator with the correct args', async () => {
      const rawConfig = {
        method: 'POST',
        endpoints: ['/endpoint1'],
        type: 'MyCoolType',
        bodyPath: './request.json',
      }

      const mappedBody = { hello: 'world' }
      readJsonAsync.mockResolvedValue(mappedBody)

      await mapRequestConfig(rawConfig, typeValidator, Mode.Serve)

      expect(typeValidator.getProblems).toHaveBeenCalledWith(mappedBody, 'MyCoolType', ProblemType.Request)
    })

    it('throws when the mapped body does not match the type', async () => {
      const rawConfig = {
        method: 'POST',
        endpoints: ['/endpoint1'],
        type: 'MyCoolType',
        bodyPath: './request.json',
      }

      const mappedBody = { hello: 'world' }
      readJsonAsync.mockResolvedValue(mappedBody)
      typeValidator.getProblems.mockResolvedValue([{} as Problem])

      await expect(mapRequestConfig(rawConfig, typeValidator, Mode.Serve)).rejects.toThrowError()
    })
  })

  describe('serve mode body particulars', () => {
    it('maps endpoints when serveEndpoint is given', async () => {
      const rawConfig = {
        method: 'GET',
        serveEndpoint: '/serve-endpoint',
        type: 'MyType',
        body: 'silly',
      }

      const mappedConfig = (await mapRequestConfig(rawConfig, typeValidator, Mode.Serve))[0]

      expect(mappedConfig.body).toBe('silly')
      expect(mappedConfig.endpoint).toBe('/serve-endpoint')
      expect(mappedConfig.method).toBe('GET')
      expect(mappedConfig.type).toBe('MyType')
    })

    it('maps body when a serveBodyPath is given', async () => {
      const rawConfig = {
        method: 'GET',
        endpoints: ['/endpoint1'],
        type: 'MyType',
        serveBodyPath: './silly.json',
      }

      readJsonAsync.mockResolvedValue({ silly: 'billy' })

      const mappedConfig = (await mapRequestConfig(rawConfig, typeValidator, Mode.Serve))[0]

      expect(readJsonAsync).toHaveBeenCalledWith('./silly.json')
      expect(mappedConfig.body).toStrictEqual({ silly: 'billy' })
    })

    it('maps body when a serveBody is given', async () => {
      const rawConfig = {
        method: 'GET',
        endpoints: ['/endpoint1'],
        type: 'MyType',
        serveBody: 'silly',
      }

      readJsonAsync.mockResolvedValue({ silly: 'billy' })

      const mappedConfig = (await mapRequestConfig(rawConfig, typeValidator, Mode.Serve))[0]

      expect(mappedConfig.body).toBe('silly')
    })
  })
})
