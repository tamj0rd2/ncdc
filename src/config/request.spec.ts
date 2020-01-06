import { RequestConfig, mapRequestConfig } from './request'
import * as _path from 'path'
import { mockObj, mockFn } from '~test-helpers'
import { TypeValidator } from '~validation'
import Problem, { ProblemType } from '~problem'
import { Mode } from './config'
import { GetBodyToUse } from './body'

jest.mock('path')

describe('mapRequestConfig', () => {
  // const { getBodyToUse } = mockObj(_io)
  const typeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })
  const { resolve } = mockObj(_path)
  const getBodyToUse = mockFn<GetBodyToUse>()

  afterEach(() => {
    jest.resetAllMocks()
    resolve.mockImplementation((...args) => args[1])
    getBodyToUse.mockResolvedValue('default body for')
  })

  const basicMappingCases: [Mode.Serve | Mode.Test][] = [[Mode.Test], [Mode.Serve]]
  it.each(basicMappingCases)('maps a basic %s config correctly', async mode => {
    const rawConfig = {
      method: 'GET',
      endpoints: ['/endpoint1', '/endpoint2'],
      type: 'MyType',
      body: 'silly',
      headers: { header1: 'yo' },
    }

    getBodyToUse.mockResolvedValue('silly')

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

    await expect(mapRequestConfig(rawConfig, typeValidator, mode, getBodyToUse)).resolves.toMatchObject(
      expected,
    )
  })

  it('maps a config with endpoints as a string', async () => {
    const rawConfig = {
      method: 'GET',
      endpoints: '/endpoint1',
    }

    const result = await mapRequestConfig(rawConfig, typeValidator, Mode.Test, getBodyToUse)

    expect(result).toHaveLength(1)
    expect(result[0].endpoint).toEqual('/endpoint1')
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
      await expect(
        mapRequestConfig(combinedConfig, typeValidator, Mode.Test, getBodyToUse),
      ).resolves.not.toThrowError()
      await expect(
        mapRequestConfig(combinedConfig, typeValidator, Mode.Serve, getBodyToUse),
      ).resolves.not.toThrowError()
    },
  )

  describe('when a body and type are both given', () => {
    it('calls the type validator with the correct args', async () => {
      const rawConfig = {
        method: 'POST',
        endpoints: ['/endpoint1'],
        type: 'MyCoolType',
        bodyPath: './request.json',
      }

      const mappedBody = { hello: 'world' }
      getBodyToUse.mockResolvedValue(mappedBody)

      await mapRequestConfig(rawConfig, typeValidator, Mode.Serve, getBodyToUse)

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
      getBodyToUse.mockResolvedValue(mappedBody)
      typeValidator.getProblems.mockResolvedValue([{} as Problem])

      await expect(
        mapRequestConfig(rawConfig, typeValidator, Mode.Serve, getBodyToUse),
      ).rejects.toThrowError()
    })
  })
})
