import { mapRequestConfig, RequestSchema, RequestConfig } from './request'
import { mockObj, mockFn, mockCtor } from '~test-helpers'
import { TypeValidator, TypeValidationError } from '~validation'
import Problem, { ProblemType } from '~problem'
import { GetBodyToUse } from '../body'

jest.unmock('./request')
// TODO: remove yup workaround
jest.unmock('yup')
jest.unmock('../methods')

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
      mockCtor(TypeValidationError).mockImplementation(() => new Error('Yikes'))

      await expect(mapRequestConfig(requestSchema, typeValidator, getRequestBody)).rejects.toThrowError(
        'Yikes',
      )
    })
  })

  it('returns a config for each endpoint specified', async () => {
    const requestSchema: RequestSchema = {
      method: 'GET',
      endpoints: ['/endpoint1', '/endpoint2'],
    }

    const configs = (await mapRequestConfig(requestSchema, typeValidator, getRequestBody)) as PopulatedArray<
      RequestConfig
    >

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

    const configs = (await mapRequestConfig(requestSchema, typeValidator, getRequestBody)) as PopulatedArray<
      RequestConfig
    >

    expect(configs).toHaveLength(1)
    expect(configs[0].endpoint).toEqual('supa hot')
  })
})
