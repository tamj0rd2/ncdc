import { doItAll, FetchResource, ValidationFlags } from './validators'
import TypeValidator from './type-validator'
import { TestConfig } from '../config/config'
import Problem, { ProblemType } from '../problem'
import * as messages from '../messages'
import { mockObj, mockFn } from '../test-helpers'

jest.mock('../problem')
jest.mock('../messages')

describe('validators', () => {
  const mockTypeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })
  const mockFetchResource = mockFn<FetchResource>()
  const mockProblemCtor = mockObj(Problem)
  const mockMessages = mockObj(messages)

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns an empty list when all validations succeed', async () => {
    const config: Partial<TestConfig> = {
      request: {
        endpoint: '/tables/drop',
        method: 'POST',
        type: 'string',
        body: 'drop everything!',
      },
      response: {
        code: 401,
        body: 'not today son',
        type: 'string',
      },
    }

    mockFetchResource.mockResolvedValue({ status: 401, data: 'not today son' })

    const results = await doItAll(
      mockTypeValidator,
      mockFetchResource,
      ValidationFlags.All,
    )(config as TestConfig)

    expect(results).toHaveLength(0)
  })

  it('returns problems when request body does not match the given type', async () => {
    const flags: ValidationFlags[] = [ValidationFlags.RequestType]
    const config: Partial<TestConfig> = {
      request: {
        method: 'POST',
        type: 'number',
        endpoint: '/blah',
      },
    }
    const problem: Partial<Problem> = { message: 'Oh noes!' }
    mockTypeValidator.getProblems.mockResolvedValue([problem as Problem])

    const results = await doItAll(mockTypeValidator, mockFetchResource, flags)(config as TestConfig)

    expect(results).toStrictEqual([problem])
  })

  it('does not make a request if the request body is invalid', async () => {
    const flags: ValidationFlags[] = [ValidationFlags.RequestType]
    const config: Partial<TestConfig> = {
      request: {
        type: 'MyCustomType',
        endpoint: '/blah',
        method: 'POST',
        body: { check: 'out that body' },
      },
    }
    const problem: Partial<Problem> = { message: 'Whoopsie' }
    mockTypeValidator.getProblems.mockResolvedValue([problem as Problem])

    await doItAll(mockTypeValidator, mockFetchResource, flags)(config as TestConfig)

    expect(mockFetchResource).not.toHaveBeenCalled()
  })

  it('returns problems when response code does not match expected', async () => {
    const flags: ValidationFlags[] = [ValidationFlags.ResponseStatus]
    const config: Partial<TestConfig> = {
      response: {
        code: 200,
      },
    }

    mockFetchResource.mockResolvedValue({ status: 302 })
    mockMessages.shouldBe.mockReturnValue('message')

    const results = await doItAll(mockTypeValidator, mockFetchResource, flags)(config as TestConfig)

    expect(results).toHaveLength(1)
    expect(mockMessages.shouldBe).toHaveBeenCalledWith('status code', 200, 302)
    expect(mockProblemCtor).toHaveBeenCalledWith({ data: 302, message: 'message' }, ProblemType.Response)
  })

  it('returns problems when response body does not match expected', async () => {
    const flags: ValidationFlags[] = [ValidationFlags.ResponseBody]
    const config: Partial<TestConfig> = {
      response: {
        body: 'somebody to love',
        code: 200,
      },
    }

    mockFetchResource.mockResolvedValue({ status: 200, data: 'RIP' })
    mockMessages.shouldBe.mockReturnValue('message2')

    const results = await doItAll(mockTypeValidator, mockFetchResource, flags)(config as TestConfig)

    expect(results).toHaveLength(1)
    expect(mockMessages.shouldBe).toHaveBeenCalledWith('body', 'somebody to love', 'RIP')
    expect(mockProblemCtor).toHaveBeenCalledWith({ data: 'RIP', message: 'message2' }, ProblemType.Response)
  })

  it('returns problems when response type does not match expected', async () => {
    const flags: ValidationFlags[] = [ValidationFlags.ResponseType]
    const config: Partial<TestConfig> = {
      response: {
        body: 'ayy lmao',
        code: 404,
        type: 'MyFakeType',
      },
    }

    mockFetchResource.mockResolvedValue({ status: 404, data: 'ayy' })
    const problem: Partial<Problem> = { message: 'Yikes' }
    mockTypeValidator.getProblems.mockResolvedValue([problem as Problem])

    const results = await doItAll(mockTypeValidator, mockFetchResource, flags)(config as TestConfig)

    expect(results).toStrictEqual([problem])
  })
})
