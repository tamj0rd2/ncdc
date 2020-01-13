import { mapRequestConfig, RequestSchema, getRequestSchema } from './request'
import { mockObj, mockFn } from '~test-helpers'
import { TypeValidator } from '~validation'
import Problem, { ProblemType } from '~problem'
import { GetBodyToUse } from '../body'
import { Mode } from '~config/types'
import { getTestSchema } from './test-schema'
import { getServeSchema } from './serve-schema'

// TODO: remove yup workaround
jest.disableAutomock()
jest.mock('~problem')
jest.mock('./test-schema')
jest.mock('./serve-schema')

describe('mapRequestConfig', () => {
  const getRequestBody = mockFn<GetBodyToUse>()
  const typeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })

  afterEach(() => jest.resetAllMocks())

  it('calls get body with the correct args', async () => {
    const requestSchema: RequestSchema = {
      method: 'GET',
      body: 'body',
      endpoints: ['endpoint1'],
    }

    await mapRequestConfig(requestSchema, typeValidator, getRequestBody)

    expect(getRequestBody).toHaveBeenCalledWith(requestSchema)
  })

  describe('when a body and type are both given', () => {
    it('calls the type validator with the correct args', async () => {
      const requestSchema: RequestSchema = {
        method: 'POST',
        endpoints: ['/endpoint1'],
        type: 'MyCoolType',
        bodyPath: './request.json',
      }

      const mappedBody = { hello: 'world' }
      getRequestBody.mockResolvedValue(mappedBody)

      await mapRequestConfig(requestSchema, typeValidator, getRequestBody)

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
      getRequestBody.mockResolvedValue(mappedBody)
      typeValidator.getProblems.mockResolvedValue([{} as Problem])

      await expect(mapRequestConfig(requestSchema, typeValidator, getRequestBody)).rejects.toThrowError()
    })
  })

  it('returns a config for each endpoint specified', async () => {
    const requestSchema: RequestSchema = {
      method: 'GET',
      endpoints: ['/endpoint1', '/endpoint2'],
    }

    const configs = await mapRequestConfig(requestSchema, typeValidator, getRequestBody)

    expect(configs).toHaveLength(2)
    expect(configs[0].endpoint).toEqual('/endpoint1')
    expect(configs[1].endpoint).toEqual('/endpoint2')
  })

  it('returns a single config when serveEndpoint is given', async () => {
    const requestSchema: RequestSchema = {
      method: 'GET',
      endpoints: ['/endpoint1'],
      serveEndpoint: 'supa hot',
    }

    const configs = await mapRequestConfig(requestSchema, typeValidator, getRequestBody)

    expect(configs).toHaveLength(1)
    expect(configs[0].endpoint).toEqual('supa hot')
  })
})

describe('getRequestSchema', () => {
  afterEach(() => jest.resetAllMocks())

  it('returns the serve schema when in serve mode', () => {
    const mockServeSchema = { snooze: 'lose' }
    mockFn(getServeSchema).mockReturnValue(mockServeSchema as any)

    const result = getRequestSchema(Mode.Serve, false)

    expect(getServeSchema).toHaveBeenCalled()
    expect(result).toEqual(mockServeSchema)
  })

  it.each([[true], [false]])(
    'calls get test schema with the correct args when serve only is %s',
    serveOnly => {
      getRequestSchema(Mode.Test, serveOnly)

      expect(mockFn(getTestSchema)).toHaveBeenCalledWith(serveOnly)
    },
  )

  it('returns the test schema when in test mode', () => {
    const mockTestSchema = { hello: 'world' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFn(getTestSchema).mockReturnValue(mockTestSchema as any)

    const result = getRequestSchema(Mode.Test, false)

    expect(result).toEqual(mockTestSchema)
  })
})
