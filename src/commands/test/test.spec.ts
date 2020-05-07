import { testConfigs } from './test'
import { randomString, mockFn, mockObj, mocked } from '~test-helpers'
import { FetchResource, TypeValidator, doItAll } from '~validation'
import { TestFn } from '~validation/validators'
import logger from '~logger'
import stripAnsi from 'strip-ansi'
import { ProblemType } from '~problem'
import { Config } from '~config-old'

jest.unmock('./test')
jest.unmock('~messages')
jest.unmock('~commands/shared')

describe('test configs', () => {
  const baseUrl = randomString('base-url')
  const mockFetchResource = mockFn<FetchResource>()
  const mockTypeValidator = mockObj<TypeValidator>({})
  const mockTest = mockFn<TestFn>()
  const mockDoItAll = mocked(doItAll)
  const mockLogger = mockObj(logger)

  beforeEach(() => {
    jest.resetAllMocks()
    mockDoItAll.mockReturnValue(mockTest)
  })

  it('calls doItAll with the correct args', async () => {
    const configs: Config[] = [{ name: 'yo!', request: { endpoint: randomString('endpoint') } } as Config]
    mockTest.mockResolvedValue([])

    await testConfigs(baseUrl, mockFetchResource, configs, mockTypeValidator)

    expect(mockDoItAll).toBeCalledWith(mockTypeValidator, mockFetchResource)
  })

  it('logs when a test passes', async () => {
    const configs: Config[] = [{ name: 'yo!', request: { endpoint: randomString('endpoint') } } as Config]
    mockTest.mockResolvedValue([])

    await testConfigs(baseUrl, mockFetchResource, configs, mockTypeValidator)

    const expectedMessage = `PASSED: yo! - ${baseUrl}${configs[0].request.endpoint}\n`
    expect(mockLogger.info).toBeCalled()
    expect(stripAnsi((mockLogger.info.mock.calls[0][0] as unknown) as string)).toEqual(expectedMessage)
  })

  it('logs when a test fail', async () => {
    const configs: Config[] = [{ name: 'yo!', request: { endpoint: randomString('endpoint') } } as Config]
    mockTest.mockResolvedValue([{ path: 'some.path', problemType: ProblemType.Request, message: 'message' }])

    await expect(testConfigs(baseUrl, mockFetchResource, configs, mockTypeValidator)).rejects.toThrowError(
      'Not all tests passed',
    )

    const expectedMessage = `FAILED: yo!\nURL: ${baseUrl}${configs[0].request.endpoint}\n`
    const expectedError1 = `Request some.path message\n`
    expect(mockLogger.error).toBeCalled()
    expect(stripAnsi((mockLogger.error.mock.calls[0][0] as unknown) as string)).toEqual(
      expectedMessage + expectedError1,
    )
  })

  it('logs when a test throws an error', async () => {
    const configs: Config[] = [{ name: 'yo!', request: { endpoint: randomString('endpoint') } } as Config]
    mockTest.mockRejectedValue(new Error('woah dude'))

    await expect(testConfigs(baseUrl, mockFetchResource, configs, mockTypeValidator)).rejects.toThrowError(
      'Not all tests passed',
    )

    const expectedMessage = `ERROR: yo!\nURL: ${baseUrl}${configs[0].request.endpoint}\nwoah dude\n`
    expect(mockLogger.error).toBeCalled()
    expect(stripAnsi((mockLogger.error.mock.calls[0][0] as unknown) as string)).toEqual(expectedMessage)
  })
})
