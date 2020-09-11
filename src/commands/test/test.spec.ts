import { runTests, GetTypeValidator } from './test'
import { randomString, mockFn, mockObj, randomNumber } from '~test-helpers'
import stripAnsi from 'strip-ansi'
import { FetchResource } from './http-client'
import { TypeValidator } from '~validation'
import { ResourceBuilder } from '~config'
import { Logger } from 'winston'
import { ReportMetric } from '~commands/shared'
import { NcdcLogger } from '~logger'

jest.disableAutomock()

describe('test configs', () => {
  function createTestDeps() {
    const baseUrl = randomString('http://example') + '.com'
    const mockLogger = mockObj<Logger>({ error: jest.fn(), info: jest.fn() })
    const mockFetchResource = mockFn<FetchResource>()
    const mockTypeValidator = mockObj<TypeValidator>({ validate: jest.fn() })
    const mockGetTypeValidator = mockFn<GetTypeValidator>()
    const dummyReportMetric: ReportMetric = () => ({
      fail: jest.fn(),
      subMetric: jest.fn(),
      success: jest.fn(),
    })

    return {
      baseUrl,
      mockLogger,
      mockFetchResource,
      mockTypeValidator,
      mockGetTypeValidator,
      dummyReportMetric,
    }
  }

  afterEach(() => jest.resetAllMocks())

  const getLoggedMessage = (method: 'error' | 'info', logger: jest.Mocked<NcdcLogger>): string =>
    stripAnsi((logger[method].mock.calls[0][0] as unknown) as string)

  it('calls fetchResource with the correct args', async () => {
    const {
      baseUrl,
      mockFetchResource,
      mockGetTypeValidator,
      mockLogger,
      dummyReportMetric,
    } = createTestDeps()
    const config = new ResourceBuilder().build()
    mockFetchResource.mockResolvedValue({ status: randomNumber() })

    await runTests(baseUrl, mockFetchResource, [config], mockGetTypeValidator, mockLogger, dummyReportMetric)

    expect(mockFetchResource).toBeCalledWith(config)
  })

  it('logs a failure when fetching a resource throws', async () => {
    const {
      baseUrl,
      mockFetchResource,
      mockGetTypeValidator,
      mockLogger,
      dummyReportMetric,
    } = createTestDeps()
    const config = new ResourceBuilder().withName('Bob').withEndpoint('/jim').build()
    const errorMessage = randomString('error message')
    mockFetchResource.mockRejectedValue(new Error(errorMessage))

    const result = await runTests(
      baseUrl,
      mockFetchResource,
      [config],
      mockGetTypeValidator,
      mockLogger,
      dummyReportMetric,
    )

    expect(getLoggedMessage('error', mockLogger)).toEqual(`FAILED: Bob - ${baseUrl}/jim\n${errorMessage}`)
    expect(result).toEqual('Failure')
  })

  it('returns a failed message when the status code does not match', async () => {
    const {
      baseUrl,
      mockFetchResource,
      mockGetTypeValidator,
      mockLogger,
      dummyReportMetric,
    } = createTestDeps()
    const expectedStatus = randomNumber()
    const config = new ResourceBuilder()
      .withName('Bob')
      .withEndpoint('/jim')
      .withResponseCode(expectedStatus)
      .build()
    mockFetchResource.mockResolvedValue({ status: 123 })

    const result = await runTests(
      baseUrl,
      mockFetchResource,
      [config],
      mockGetTypeValidator,
      mockLogger,
      dummyReportMetric,
    )

    expect(getLoggedMessage('error', mockLogger)).toEqual(
      `FAILED: Bob - ${baseUrl}/jim\nExpected status code ${expectedStatus} but got 123`,
    )
    expect(result).toEqual('Failure')
  })

  describe('validation when a response body is configured', () => {
    it('does not return a failure message when the body matches the specified object', async () => {
      const {
        baseUrl,
        mockFetchResource,
        mockGetTypeValidator,
        mockLogger,
        dummyReportMetric,
      } = createTestDeps()
      const config = new ResourceBuilder()
        .withName('Bob')
        .withEndpoint('/jim')
        .withResponseBody({ hello: ['to', 'the', { world: 'earth' }], cya: 'later', mate: 23 })
        .build()
      mockFetchResource.mockResolvedValue({
        status: 200,
        data: { hello: ['to', 'the', { world: 'earth' }], cya: 'later', mate: 23 },
      })

      const result = await runTests(
        baseUrl,
        mockFetchResource,
        [config],
        mockGetTypeValidator,
        mockLogger,
        dummyReportMetric,
      )

      expect(getLoggedMessage('info', mockLogger)).toEqual(`PASSED: Bob - ${baseUrl}/jim`)
      expect(result).toEqual('Success')
    })

    it('returns a failure message when the response body is undefined', async () => {
      const {
        baseUrl,
        mockFetchResource,
        mockGetTypeValidator,
        mockLogger,
        dummyReportMetric,
      } = createTestDeps()
      const config = new ResourceBuilder()
        .withName('Bob')
        .withEndpoint('/jim')
        .withResponseBody(randomString('body'))
        .build()
      mockFetchResource.mockResolvedValue({ status: 200 })

      const result = await runTests(
        baseUrl,
        mockFetchResource,
        [config],
        mockGetTypeValidator,
        mockLogger,
        dummyReportMetric,
      )

      expect(getLoggedMessage('error', mockLogger)).toEqual(
        `FAILED: Bob - ${baseUrl}/jim\nNo response body was received`,
      )
      expect(result).toEqual('Failure')
    })

    it('returns a failure message when the body does not match the specified object', async () => {
      const {
        baseUrl,
        mockFetchResource,
        mockGetTypeValidator,
        mockLogger,
        dummyReportMetric,
      } = createTestDeps()
      const config = new ResourceBuilder()
        .withName('Bob')
        .withEndpoint('/jim')
        .withResponseBody({ hello: ['to', 'the', { world: 'earth' }], cya: 'later', mate: 23 })
        .build()
      const actualResponseBody = { hello: 'world' }
      mockFetchResource.mockResolvedValue({ status: 200, data: actualResponseBody })

      const result = await runTests(
        baseUrl,
        mockFetchResource,
        [config],
        mockGetTypeValidator,
        mockLogger,
        dummyReportMetric,
      )

      expect(getLoggedMessage('error', mockLogger)).toEqual(
        `FAILED: Bob - ${baseUrl}/jim\nThe response body was not deeply equal to your configured fixture\nReceived:\n{ hello: 'world' }`,
      )
      expect(result).toEqual('Failure')
    })
  })

  describe('when the config has a response type specified', () => {
    it('calls the type validator with the correct params', async () => {
      const {
        baseUrl,
        mockFetchResource,
        mockGetTypeValidator,
        mockLogger,
        dummyReportMetric,
        mockTypeValidator,
      } = createTestDeps()
      const config = new ResourceBuilder()
        .withName('Bob')
        .withEndpoint('/jim')
        .withResponseType(randomString('res type'))
        .withResponseBody(undefined)
        .build()
      const actualData = randomString('data')
      mockFetchResource.mockResolvedValue({ status: 200, data: actualData })
      mockTypeValidator.validate.mockResolvedValue({ success: true })
      mockGetTypeValidator.mockResolvedValue(mockTypeValidator)

      await runTests(
        baseUrl,
        mockFetchResource,
        [config],
        mockGetTypeValidator,
        mockLogger,
        dummyReportMetric,
      )

      expect(mockTypeValidator.validate).toBeCalledWith(actualData, config.response.type)
    })

    it('logs a success message when the types match', async () => {
      const {
        baseUrl,
        mockFetchResource,
        mockGetTypeValidator,
        mockLogger,
        dummyReportMetric,
        mockTypeValidator,
      } = createTestDeps()
      const config = new ResourceBuilder()
        .withName('Bob')
        .withEndpoint('/jim')
        .withResponseType(randomString('res type'))
        .withResponseBody(undefined)
        .build()
      mockTypeValidator.validate.mockResolvedValue({ success: true })
      mockFetchResource.mockResolvedValue({ status: 200 })
      mockGetTypeValidator.mockResolvedValue(mockTypeValidator)

      const result = await runTests(
        baseUrl,
        mockFetchResource,
        [config],
        mockGetTypeValidator,
        mockLogger,
        dummyReportMetric,
      )

      expect(getLoggedMessage('info', mockLogger)).toEqual(`PASSED: Bob - ${baseUrl}/jim`)
      expect(result).toEqual('Success')
    })

    it('returns a failure message when the types do not match', async () => {
      const {
        baseUrl,
        mockFetchResource,
        mockGetTypeValidator,
        mockLogger,
        dummyReportMetric,
        mockTypeValidator,
      } = createTestDeps()
      const config = new ResourceBuilder()
        .withName('Bob')
        .withEndpoint('/jim')
        .withResponseType(randomString('res type'))
        .withResponseBody(undefined)
        .build()
      const error1 = randomString('error2')
      const error2 = randomString('error2')
      mockTypeValidator.validate.mockResolvedValue({ success: false, errors: [error1, error2] })
      mockFetchResource.mockResolvedValue({ status: 200 })
      mockGetTypeValidator.mockResolvedValue(mockTypeValidator)

      const result = await runTests(
        baseUrl,
        mockFetchResource,
        [config],
        mockGetTypeValidator,
        mockLogger,
        dummyReportMetric,
      )

      const expectedPart1 = `FAILED: Bob - ${baseUrl}/jim\n`
      const expectedPart2 = `The received body does not match the type ${config.response.type}\n`
      const expectedPart3 = `${error1}\n${error2}`
      expect(getLoggedMessage('error', mockLogger)).toEqual(
        `${expectedPart1}${expectedPart2}${expectedPart3}`,
      )
      expect(result).toEqual('Failure')
    })
  })
})
