import CDCTester from './cdc-tester'
import { AxiosInstance, AxiosError, AxiosResponse } from 'axios'
import TypeValidator from '../validation/type-validator'
import { ResponseConfig } from '../config'
import * as _messages from '../messages'
import * as _problem from '../problem'
import Problem from '../problem'

jest.mock('../messages')
jest.mock('../problem')

describe('CDC Tester', () => {
  const loader = mockObj<AxiosInstance>({ get: jest.fn() })
  const typeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })
  const messages = mockObj(_messages)
  const problemCtor = (_problem as jest.Mocked<typeof _problem>).default

  let cdcTester: CDCTester

  beforeEach(() => {
    jest.resetAllMocks()
    cdcTester = new CDCTester(loader, typeValidator)
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
      messages.errorNoResponse.mockReturnValue('error msg')

      await expect(cdcTester.test({}, endpoint, 'GET')).rejects.toThrowError('error msg')
      expect(messages.errorNoResponse).toBeCalledWith(baseURL + endpoint)
    })

    it('throws an error when there is a bad status code and no expected code was specified', async () => {
      const endpoint = 'some/endpoint'
      const baseURL = 'woah.dude'
      loader.defaults = { baseURL }

      const response: Partial<AxiosResponse> = { status: 404 }
      const error: Partial<AxiosError> = { response: response as AxiosResponse }

      loader.get.mockRejectedValue(error)
      messages.errorBadStatusCode.mockReturnValue('error msg2')

      await expect(cdcTester.test({}, endpoint, 'GET')).rejects.toThrowError('error msg2')
      expect(messages.errorBadStatusCode).toBeCalledWith(baseURL + endpoint, 404)
    })

    it('throws an error when the response code does not match expected', async () => {
      const endpoint = 'some/endpoint'
      const baseURL = 'woah.dude'
      loader.defaults = { baseURL }

      const response: Partial<AxiosResponse> = { status: 503 }
      const error: Partial<AxiosError> = { response: response as AxiosResponse }
      loader.get.mockRejectedValue(error)
      messages.errorWrongStatusCode.mockReturnValue('error msg2')

      await expect(cdcTester.test({ code: 404 }, endpoint, 'GET')).rejects.toThrowError('error msg2')
      expect(messages.errorWrongStatusCode).toBeCalledWith(baseURL + endpoint, 404, 503)
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
    loader.get.mockResolvedValue({ status: 404 })

    const results = await cdcTester.test({ code: 123 }, 'endpoint', 'GET')

    expect(messages.shouldBe).toBeCalledWith('status code', 123, 404)
    expect(results).toHaveLength(1)
  })

  it('returns a problem when the response body does not match expected', async () => {
    loader.get.mockResolvedValue({ data: 'response bro' })
    messages.shouldBe.mockReturnValue('message')
    const expectedProblem: Partial<Problem> = { path: 'you did it!' }
    problemCtor.mockImplementation(() => expectedProblem as Problem)

    const results = await cdcTester.test({ body: 'response yo' }, 'endpoint', 'GET')

    expect(messages.shouldBe).toBeCalledWith('body', 'response yo', 'response bro')
    expect(problemCtor).toBeCalledWith({ message: 'message', data: 'response bro' })
    expect(results).toContain(expectedProblem)
  })

  it('returns a problem when the response type does not match expected', async () => {
    const expectedProblem: Partial<Problem> = { path: 'some path' }
    typeValidator.getProblems.mockReturnValue([expectedProblem as Problem])
    loader.get.mockResolvedValue({ data: 'stuff' })

    const results = await cdcTester.test({ type: 'MyType' }, 'endpoint', 'GET')

    expect(results).toStrictEqual([expectedProblem])
  })
})
