import CDCTester from './cdc-tester'
import { AxiosInstance, AxiosError, AxiosResponse } from 'axios'
import TypeValidator from '../validation/type-validator'
import { ResponseConfig } from '../config'
import { MapToProblem } from '../messages'
import { DetailedProblem } from '../types'

describe('CDC Tester', () => {
  const loader = mockObj<AxiosInstance>({ get: jest.fn() })
  const typeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })
  const mapToProblem: jest.MockedFunction<MapToProblem> = jest.fn()
  let cdcTester: CDCTester

  beforeEach(() => {
    jest.resetAllMocks()
    cdcTester = new CDCTester(loader, typeValidator, mapToProblem)
  })

  it('returns an empty list when there are no problems', async () => {
    const responseConfig: ResponseConfig = {
      code: 200,
      body: 'Hello, world!',
      type: 'string',
    }
    loader.get.mockResolvedValue({ status: 200, data: 'Hello, world!' })

    const results = await cdcTester.test(responseConfig, 'endpoint', 'GET')

    expect(results).toHaveLength(0)
  })

  it('calls the loader with the correct args for a GET request', async () => {
    const endpoint = '/blah'

    await cdcTester.test({}, endpoint, 'GET')

    expect(loader.get).toBeCalledWith(endpoint)
  })

  describe('error calling service', () => {
    it('throws an error when there is no service response', async () => {
      const endpoint = '/some/endpoint'
      const baseURL = 'my-site.com'
      loader.defaults = { baseURL }
      loader.get.mockRejectedValue(new Error('welp'))

      await expect(cdcTester.test({}, endpoint, 'GET')).rejects.toThrowError(
        `No response from ${baseURL + endpoint}`,
      )
    })

    it('throws an error when the response code does not match expected', async () => {
      const endpoint = 'some/endpoint'
      const baseURL = 'woah.dude'
      loader.defaults = { baseURL }
      const response: Partial<AxiosResponse> = { status: 503 }
      const error: Partial<AxiosError> = { response: response as AxiosResponse }
      loader.get.mockRejectedValue(error)

      await expect(cdcTester.test({ code: 404 }, endpoint, 'GET')).rejects.toThrowError(
        `Expected status code ${404} from ${baseURL + endpoint} but got ${503}`,
      )
    })

    it('continues the test if the response code matches', async () => {
      const response: Partial<AxiosResponse> = { status: 404 }
      const error: Partial<AxiosError> = { response: response as AxiosResponse }
      loader.get.mockRejectedValue(error)

      const results = await cdcTester.test({ code: 404 }, 'endpoint', 'GET')

      expect(results).toHaveLength(0)
    })
  })

  it('returns a problem when the response code does not match expected', async () => {
    const expectedProblem: DetailedProblem = { dataPath: 'some path' }
    mapToProblem.mockReturnValue(expectedProblem)
    loader.get.mockResolvedValue({ status: 404 })

    const results = await cdcTester.test({ code: 123 }, 'endpoint', 'GET')

    expect(mapToProblem).toBeCalledWith('status code', 123, 404)
    expect(results).toContain(expectedProblem)
  })

  it('returns a problem when the response body does not match expected', async () => {
    const expectedProblem: DetailedProblem = { dataPath: 'some path' }
    mapToProblem.mockReturnValue(expectedProblem)
    loader.get.mockResolvedValue({ data: 'response bro' })

    const results = await cdcTester.test({ body: 'response yo' }, 'endpoint', 'GET')

    expect(mapToProblem).toBeCalledWith('body', 'response yo', 'response bro')
    expect(results).toContain(expectedProblem)
  })

  it('returns a problem when the response type does not match expected', async () => {
    const expectedProblem = { dataPath: 'some path' }
    typeValidator.getProblems.mockReturnValue([expectedProblem])
    loader.get.mockResolvedValue({ data: 'stuff' })

    const results = await cdcTester.test({ type: 'MyType' }, 'endpoint', 'GET')

    expect(results).toStrictEqual([expectedProblem])
  })
})
