import CDCTester from './cdc-tester'
import { AxiosInstance, AxiosError, AxiosResponse } from 'axios'
import TypeValidator from '../validation/type-validator'
import { TestConfig } from '../config'
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
    const config: Partial<TestConfig> = {
      request: {
        method: 'GET',
        endpoint: 'endpoint',
      },
      response: {
        code: 200,
        body: 'Hello, world!',
        type: 'string',
      },
    }
    loader.get.mockResolvedValue({ status: 200, data: 'Hello, world!' })

    const results = await cdcTester.test(config as TestConfig)

    expect(results).toHaveLength(0)
  })

  it('returns problems when request body has type validation problems', async () => {
    const config: Partial<TestConfig> = {
      request: {
        method: 'POST',
        body: 'My body',
        type: 'number',
        endpoint: '/blah',
      },
    }

    const problem: Partial<Problem> = { message: 'Oh noes!' }
    typeValidator.getProblems.mockResolvedValue([problem as Problem])

    const results = await cdcTester.test(config as TestConfig)

    expect(results).toStrictEqual([problem])
    expect(loader.get).not.toHaveBeenCalled()
    expect(loader.post).not.toHaveBeenCalled()
  })

  it('calls the loader with the correct args for a GET request', async () => {
    const config: Partial<TestConfig> = {
      request: {
        method: 'GET',
        endpoint: '/blah',
      },
      response: { code: 200 },
    }
    loader.get.mockResolvedValue({ status: 200 })

    await cdcTester.test(config as TestConfig)

    expect(loader.get).toBeCalledWith('/blah')
  })

  it('calls the loader with the correct args for a POST request', async () => {
    const config: Partial<TestConfig> = {
      request: {
        method: 'POST',
        endpoint: '/blah',
        body: 'Ello',
      },
      response: { code: 200 },
    }
    loader.post.mockResolvedValue({ status: 200 })

    await cdcTester.test(config as TestConfig)

    expect(loader.post).toBeCalledWith('/blah', 'Ello')
  })

  describe('error calling service', () => {
    it('throws an error when there is no service response', async () => {
      const config: Partial<TestConfig> = {
        request: {
          method: 'GET',
          endpoint: '/some/endpoint',
        },
        response: {
          code: 200,
        },
      }

      const endpoint = '/some/endpoint'
      const baseURL = 'my-site.com'
      loader.defaults = { baseURL }

      loader.get.mockRejectedValue(new Error('welp'))
      messages.errorNoResponse.mockReturnValue('error msg')

      await expect(cdcTester.test(config as TestConfig)).rejects.toThrowError('error msg')
      expect(messages.errorNoResponse).toBeCalledWith(baseURL + endpoint)
    })

    it('throws an error when the response code does not match expected', async () => {
      const config: Partial<TestConfig> = {
        request: {
          method: 'GET',
          endpoint: '/some/endpoint',
        },
        response: { code: 404 },
      }

      const baseURL = 'woah.dude'
      loader.defaults = { baseURL }

      const response: Partial<AxiosResponse> = { status: 503 }
      const error: Partial<AxiosError> = { response: response as AxiosResponse }
      loader.get.mockRejectedValue(error)
      messages.errorWrongStatusCode.mockReturnValue('error msg2')

      await expect(cdcTester.test(config as TestConfig)).rejects.toThrowError('error msg2')
      expect(messages.errorWrongStatusCode).toBeCalledWith(baseURL + config.request!.endpoint, 404, 503)
    })

    it('continues the test if the response code matches', async () => {
      const config: Partial<TestConfig> = {
        request: {
          method: 'GET',
          endpoint: 'endpoint',
        },
        response: { code: 404 },
      }
      const response: Partial<AxiosResponse> = { status: 404 }
      const error: Partial<AxiosError> = { response: response as AxiosResponse }
      loader.get.mockRejectedValue(error)

      const results = await cdcTester.test(config as TestConfig)

      expect(results).toHaveLength(0)
    })
  })

  it('returns a problem when the response code does not match expected', async () => {
    const config: Partial<TestConfig> = {
      request: {
        method: 'GET',
        endpoint: 'endpoint',
      },
      response: { code: 123 },
    }

    loader.get.mockResolvedValue({ status: 404 })

    const results = await cdcTester.test(config as TestConfig)

    expect(messages.shouldBe).toBeCalledWith('status code', 123, 404)
    expect(results).toHaveLength(1)
  })

  it('returns a problem when the response body does not match expected', async () => {
    const config: Partial<TestConfig> = {
      request: {
        method: 'GET',
        endpoint: 'endpoint',
      },
      response: { code: 200, body: 'response yo' },
    }

    loader.get.mockResolvedValue({ data: 'response bro' })
    messages.shouldBe.mockReturnValue('message')
    const expectedProblem: Public<Problem> = { path: 'you did it!', problemType: ProblemType.Response }
    problemCtor.mockImplementation(() => expectedProblem as Problem)

    const results = await cdcTester.test(config as TestConfig)

    expect(messages.shouldBe).toBeCalledWith('body', 'response yo', 'response bro')
    expect(problemCtor).toBeCalledWith({ message: 'message', data: 'response bro' }, ProblemType.Response)
    expect(results).toContain(expectedProblem)
  })

  it('returns a problem when the response type does not match expected', async () => {
    const config: Partial<TestConfig> = {
      request: {
        method: 'GET',
        endpoint: 'endpoint',
      },
      response: { code: 200, type: 'MyType' },
    }

    const expectedProblem: Public<Problem> = { path: 'some path', problemType: ProblemType.Response }
    typeValidator.getProblems.mockResolvedValue([expectedProblem as Problem])
    loader.get.mockResolvedValue({ data: 'stuff', status: 200 })

    const results = await cdcTester.test(config as TestConfig)

    console.dir(results)
    expect(results).toStrictEqual([expectedProblem])
  })
})
