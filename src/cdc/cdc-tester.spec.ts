import CDCTester from './cdc-tester'
import { AxiosInstance, AxiosError, AxiosResponse } from 'axios'
import TypeValidator from '../validation/type-validator'
import { ResponseConfig, RequestConfig } from '../config'
import * as _messages from '../messages'
import * as _problem from '../problem'
import Problem, { ProblemType } from '../problem'

jest.mock('../messages')
jest.mock('../problem')

describe('CDC Tester', () => {
  const loader = mockObj<AxiosInstance>({ get: jest.fn(), post: jest.fn() })
  const typeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })
  const messages = mockObj(_messages)
  const problemCtor = (_problem as jest.Mocked<typeof _problem>).default

  let cdcTester: CDCTester

  beforeEach(() => {
    jest.resetAllMocks()
    loader.defaults = { baseURL: 'some url' }
    cdcTester = new CDCTester(loader, typeValidator)
  })

  it('returns an empty list when there are no problems', async () => {
    const requestConfig: RequestConfig = {
      method: 'GET',
      endpoint: 'endpoint',
    }
    const responseConfig: ResponseConfig = {
      code: 200,
      body: 'Hello, world!',
      type: 'string',
    }
    loader.get.mockResolvedValue({ status: 200, data: 'Hello, world!' })

    const results = await cdcTester.test(requestConfig, responseConfig)

    expect(results).toHaveLength(0)
  })

  it('returns problems when request body has type validation problems', async () => {
    const requestConfig: RequestConfig = {
      method: 'POST',
      body: 'My body',
      type: 'number',
      endpoint: '/blah',
    }

    const problem: Partial<Problem> = { message: 'Oh noes!' }
    typeValidator.getProblems.mockResolvedValue([problem as Problem])

    const results = await cdcTester.test(requestConfig, {})

    expect(results).toStrictEqual([problem])
    expect(loader.get).not.toHaveBeenCalled()
    expect(loader.post).not.toHaveBeenCalled()
  })

  it('calls the loader with the correct args for a GET request', async () => {
    const requestConfig: RequestConfig = {
      method: 'GET',
      endpoint: '/blah',
    }

    await cdcTester.test(requestConfig, {})

    expect(loader.get).toBeCalledWith(requestConfig.endpoint)
  })

  it('calls the loader with the correct args for a POST request', async () => {
    const requestConfig: RequestConfig = {
      method: 'POST',
      endpoint: '/blah',
      body: 'Ello',
    }

    await cdcTester.test(requestConfig, {})

    expect(loader.post).toBeCalledWith(requestConfig.endpoint, requestConfig.body)
  })

  describe('error calling service', () => {
    it('throws an error when there is no service response', async () => {
      const requestConfig: RequestConfig = {
        method: 'GET',
        endpoint: '/some/endpoint',
      }
      const endpoint = '/some/endpoint'
      const baseURL = 'my-site.com'
      loader.defaults = { baseURL }

      loader.get.mockRejectedValue(new Error('welp'))
      messages.errorNoResponse.mockReturnValue('error msg')

      await expect(cdcTester.test(requestConfig, {})).rejects.toThrowError('error msg')
      expect(messages.errorNoResponse).toBeCalledWith(baseURL + endpoint)
    })

    it('throws an error when there is a bad status code and no expected code was specified', async () => {
      const requestConfig: RequestConfig = {
        method: 'GET',
        endpoint: '/some/endpoint',
      }
      const baseURL = 'woah.dude'
      loader.defaults = { baseURL }

      const response: Partial<AxiosResponse> = { status: 404 }
      const error: Partial<AxiosError> = { response: response as AxiosResponse }

      loader.get.mockRejectedValue(error)
      messages.errorBadStatusCode.mockReturnValue('error msg2')

      await expect(cdcTester.test(requestConfig, {})).rejects.toThrowError('error msg2')
      expect(messages.errorBadStatusCode).toBeCalledWith(baseURL + requestConfig.endpoint, 404)
    })

    it('throws an error when the response code does not match expected', async () => {
      const requestConfig: RequestConfig = {
        method: 'GET',
        endpoint: '/some/endpoint',
      }
      const baseURL = 'woah.dude'
      loader.defaults = { baseURL }

      const response: Partial<AxiosResponse> = { status: 503 }
      const error: Partial<AxiosError> = { response: response as AxiosResponse }
      loader.get.mockRejectedValue(error)
      messages.errorWrongStatusCode.mockReturnValue('error msg2')

      await expect(cdcTester.test(requestConfig, { code: 404 })).rejects.toThrowError('error msg2')
      expect(messages.errorWrongStatusCode).toBeCalledWith(baseURL + requestConfig.endpoint, 404, 503)
    })

    it('continues the test if the response code matches', async () => {
      const requestConfig: RequestConfig = {
        method: 'GET',
        endpoint: 'endpoint',
      }
      const response: Partial<AxiosResponse> = { status: 404 }
      const error: Partial<AxiosError> = { response: response as AxiosResponse }
      loader.get.mockRejectedValue(error)

      const results = await cdcTester.test(requestConfig, { code: 404 })

      expect(results).toHaveLength(0)
    })
  })

  it('returns a problem when the response code does not match expected', async () => {
    const requestConfig: RequestConfig = {
      method: 'GET',
      endpoint: 'endpoint',
    }
    loader.get.mockResolvedValue({ status: 404 })

    const results = await cdcTester.test(requestConfig, { code: 123 })

    expect(messages.shouldBe).toBeCalledWith('status code', 123, 404)
    expect(results).toHaveLength(1)
  })

  it('returns a problem when the response body does not match expected', async () => {
    const requestConfig: RequestConfig = {
      method: 'GET',
      endpoint: 'endpoint',
    }
    loader.get.mockResolvedValue({ data: 'response bro' })
    messages.shouldBe.mockReturnValue('message')
    const expectedProblem: Public<Problem> = { path: 'you did it!', problemType: ProblemType.Response }
    problemCtor.mockImplementation(() => expectedProblem as Problem)

    const results = await cdcTester.test(requestConfig, { body: 'response yo' })

    expect(messages.shouldBe).toBeCalledWith('body', 'response yo', 'response bro')
    expect(problemCtor).toBeCalledWith({ message: 'message', data: 'response bro' }, ProblemType.Response)
    expect(results).toContain(expectedProblem)
  })

  it('returns a problem when the response type does not match expected', async () => {
    const requestConfig: RequestConfig = {
      method: 'GET',
      endpoint: 'endpoint',
    }
    const expectedProblem: Public<Problem> = { path: 'some path', problemType: ProblemType.Response }
    typeValidator.getProblems.mockResolvedValue([expectedProblem as Problem])
    loader.get.mockResolvedValue({ data: 'stuff' })

    const results = await cdcTester.test(requestConfig, { type: 'MyType' })

    expect(results).toStrictEqual([expectedProblem])
  })
})
