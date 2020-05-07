import { doItAll, FetchResource } from './validators'
import TypeValidator from './type-validator'
import { Config } from '~config'
import ConfigBuilder from '~config/config-builder'
import Problem, { ProblemType } from '~problem'
import * as messages from '~messages'
import { mockObj, mockFn } from '~test-helpers'

jest.unmock('./validators')
jest.unmock('~config/config-builder')

describe('validators', () => {
  const mockTypeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })
  const mockFetchResource = mockFn<FetchResource>()
  const mockProblemCtor = mockObj(Problem)
  const mockMessages = mockObj(messages)

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns an empty list when all validations succeed', async () => {
    const config: Partial<Config> = {
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

    const results = await doItAll(mockTypeValidator, mockFetchResource)(config as Config)

    expect(results).toHaveLength(0)
  })

  it('returns problems when response code does not match expected', async () => {
    const config: Partial<Config> = {
      response: {
        code: 200,
      },
    }

    mockFetchResource.mockResolvedValue({ status: 302 })
    mockMessages.shouldBe.mockReturnValue('message')

    const results = await doItAll(mockTypeValidator, mockFetchResource)(config as Config)

    expect(results).toHaveLength(1)
    expect(mockMessages.shouldBe).toHaveBeenCalledWith('status code', 200, 302)
    expect(mockProblemCtor).toHaveBeenCalledWith({ data: 302, message: 'message' }, ProblemType.Response)
  })

  describe('body validation', () => {
    describe('when the response body does not match expected', () => {
      it('returns problems when the body is a string', async () => {
        const config: Partial<Config> = {
          response: {
            body: 'somebody to love',
            code: 200,
          },
        }

        mockFetchResource.mockResolvedValue({ status: 200, data: 'RIP' })

        const results = await doItAll(mockTypeValidator, mockFetchResource)(config as Config)

        expect(results).toHaveLength(1)
        expect(mockProblemCtor).toHaveBeenCalledWith(
          { data: 'RIP', message: 'was not deeply equal to the configured fixture' },
          ProblemType.Response,
        )
      })

      it('returns problems when the configured body is an object but actual data is a string', async () => {
        const config: Partial<Config> = {
          response: {
            body: { hello: ['to', 'the', { world: 'earth' }], cya: 'later', mate: 23 },
            code: 200,
          },
        }

        mockFetchResource.mockResolvedValue({ status: 200, data: 'RIP' })
        mockMessages.shouldBe.mockReturnValue('message2')

        const results = await doItAll(mockTypeValidator, mockFetchResource)(config as Config)

        expect(results).toHaveLength(1)
        expect(mockMessages.shouldBe).toHaveBeenCalledWith('body', 'of type object', 'a string')
        expect(mockProblemCtor).toHaveBeenCalledWith(
          { data: 'RIP', message: 'message2' },
          ProblemType.Response,
        )
      })

      it('returns problems when the configured body is a string but actual data is an object', async () => {
        const config: Partial<Config> = {
          response: {
            body: 'RIP',
            code: 200,
          },
        }

        mockFetchResource.mockResolvedValue({ status: 200, data: { rip: 'aroo' } })
        mockMessages.shouldBe.mockReturnValue('message2')

        const results = await doItAll(mockTypeValidator, mockFetchResource)(config as Config)

        expect(results).toHaveLength(1)
        expect(mockMessages.shouldBe).toHaveBeenCalledWith('body', 'of type string', 'a object')
        expect(mockProblemCtor).toHaveBeenCalledWith(
          { data: { rip: 'aroo' }, message: 'message2' },
          ProblemType.Response,
        )
      })

      it('returns problems when the configured body and actual date are both objects', async () => {
        const config: Partial<Config> = {
          response: {
            body: { hello: ['to', 'the', { world: 'earth' }], cya: 'later', mate: 23 },
            code: 200,
          },
        }

        const responseData = { hello: 'world' }
        mockFetchResource.mockResolvedValue({ status: 200, data: responseData })

        const results = await doItAll(mockTypeValidator, mockFetchResource)(config as Config)

        expect(results).toHaveLength(1)
        expect(mockProblemCtor).toHaveBeenCalledWith(
          { data: responseData, message: 'was not deeply equal to the configured fixture' },
          ProblemType.Response,
        )
      })
    })

    describe('when the response body does match the expected', () => {
      it('does not return problems when both are strings', async () => {
        const expectedBody = 'coWaBunGa'
        const config: Partial<Config> = {
          response: {
            body: expectedBody,
            code: 200,
          },
        }
        mockFetchResource.mockResolvedValue({ status: 200, data: expectedBody })

        const results = await doItAll(mockTypeValidator, mockFetchResource)(config as Config)

        expect(results).toHaveLength(0)
      })

      it('does not return problems when both are objects', async () => {
        const config: Partial<Config> = {
          response: {
            body: { hello: ['to', 'the', { world: 'earth' }], cya: 'later', mate: 23 },
            code: 200,
          },
        }

        mockFetchResource.mockResolvedValue({
          status: 200,
          data: { hello: ['to', 'the', { world: 'earth' }], cya: 'later', mate: 23 },
        })

        const results = await doItAll(mockTypeValidator, mockFetchResource)(config as Config)

        expect(results).toHaveLength(0)
      })
    })
  })

  it('returns problems when response type does not match expected', async () => {
    const config: Partial<Config> = {
      response: {
        body: 'ayy lmao',
        code: 404,
        type: 'MyFakeType',
      },
    }

    mockFetchResource.mockResolvedValue({ status: 404, data: 'ayy lmao' })
    const problem: Partial<Problem> = { message: 'Yikes' }
    mockTypeValidator.getProblems.mockResolvedValue([problem as Problem])

    const results = await doItAll(mockTypeValidator, mockFetchResource)(config as Config)

    expect(results).toStrictEqual([problem])
  })

  it('does not blow up if an error is thrown while getting a response', async () => {
    const config = new ConfigBuilder().build()
    mockFetchResource.mockRejectedValue(new Error('whoops'))

    const results = await doItAll(mockTypeValidator, mockFetchResource)(config)

    expect(results).toHaveLength(1)
    expect(mockMessages.problemFetching).toHaveBeenCalledWith('whoops')
  })
})
