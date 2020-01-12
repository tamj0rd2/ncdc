import { RequestConfig, mapRequestConfig, RequestSchema, getRequestSchema } from './request'
import * as _path from 'path'
import { mockObj, mockFn } from '~test-helpers'
import { TypeValidator } from '~validation'
import Problem, { ProblemType } from '~problem'
import { GetBodyToUse } from '../body'
import { Mode } from '~config/types'
import * as serveSchema from './serve-schema'
import * as testSchema from './test-schema'

jest.mock('path')
jest.mock('./test-schema')
jest.mock('./serve-schema')

// TODO: add tests for the schemas themselves. NEEDS to be done before next release
describe('mapRequestConfig', () => {
  const typeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })
  const { resolve } = mockObj(_path)
  const getBodyToUse = mockFn<GetBodyToUse>()

  afterEach(() => {
    jest.resetAllMocks()
    resolve.mockImplementation((...args) => args[1])
    getBodyToUse.mockResolvedValue('default body for')
  })

  it('maps a basic config correctly', async () => {
    const requestSchema: RequestSchema = {
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

    await expect(mapRequestConfig(requestSchema, typeValidator, getBodyToUse)).resolves.toMatchObject(
      expected,
    )
  })

  it('maps a config with endpoints as a string', async () => {
    const requestSchema: RequestSchema = {
      method: 'GET',
      endpoints: ['/endpoint1'],
    }

    const result = await mapRequestConfig(requestSchema, typeValidator, getBodyToUse)

    expect(result).toHaveLength(1)
    expect(result[0].endpoint).toEqual('/endpoint1')
  })

  const combinedConfigCases: [RequestSchema][] = [
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
      await expect(mapRequestConfig(combinedConfig, typeValidator, getBodyToUse)).resolves.not.toThrowError()
      await expect(mapRequestConfig(combinedConfig, typeValidator, getBodyToUse)).resolves.not.toThrowError()
    },
  )

  describe('when a body and type are both given', () => {
    it('calls the type validator with the correct args', async () => {
      const requestSchema: RequestSchema = {
        method: 'POST',
        endpoints: ['/endpoint1'],
        type: 'MyCoolType',
        bodyPath: './request.json',
      }

      const mappedBody = { hello: 'world' }
      getBodyToUse.mockResolvedValue(mappedBody)

      await mapRequestConfig(requestSchema, typeValidator, getBodyToUse)

      expect(typeValidator.getProblems).toHaveBeenCalledWith(mappedBody, 'MyCoolType', ProblemType.Request)
    })

    it('throws when the mapped body does not match the type', async () => {
      const requestSchema: RequestSchema = {
        method: 'POST',
        endpoints: ['/endpoint1'],
        type: 'MyCoolType',
        bodyPath: './request.json',
      }

      const mappedBody = { hello: 'world' }
      getBodyToUse.mockResolvedValue(mappedBody)
      typeValidator.getProblems.mockResolvedValue([{} as Problem])

      await expect(mapRequestConfig(requestSchema, typeValidator, getBodyToUse)).rejects.toThrowError()
    })
  })
})

describe('getRequestSchema', () => {
  const { serveRequestSchema } = mockObj(serveSchema)
  const { getTestSchema } = mockObj(testSchema)

  it('returns the serve schema when in serve mode', () => {
    const result = getRequestSchema(Mode.Serve, false)

    expect(result).toEqual(serveRequestSchema)
  })

  it.each([[true], [false]])('calls get test schema with the correct args', serveOnly => {
    getRequestSchema(Mode.Test, serveOnly)

    expect(getTestSchema).toHaveBeenCalledWith(serveOnly)
  })

  it('returns the test schema when in test mode', () => {
    const mockTestSchema = { hello: 'world' }
    getTestSchema.mockReturnValue(mockTestSchema as any)

    const result = getRequestSchema(Mode.Test, false)

    expect(result).toEqual(mockTestSchema)
  })
})
