import { ResourceBuilder } from '~config'
import { createHttpClient } from './http-client'
import { randomString, mocked, mockObj, randomNumber } from '~test-helpers'
import fetch, { Response } from 'node-fetch'

jest.disableAutomock()
jest.mock('node-fetch')

describe('http client', () => {
  function createTestDeps() {
    const mockFetch = mocked(fetch)
    const mockResponse = mockObj<Response>({ json: jest.fn(), text: jest.fn() })
    const dummyBaseUrl = randomString('base-url')
    const dummyTimeout = randomNumber()
    const fetchResource = createHttpClient(dummyBaseUrl, dummyTimeout)

    return {
      mockFetch,
      mockResponse,
      dummyBaseUrl,
      dummyTimeout,
      fetchResource,
    }
  }

  afterEach(() => jest.resetAllMocks())

  it('calls fetch with the correct params', async () => {
    const { dummyBaseUrl, dummyTimeout, fetchResource, mockFetch, mockResponse } = createTestDeps()
    const config = new ResourceBuilder().withEndpoint('/spanners/for/days').build()
    mockFetch.mockResolvedValue(mockResponse)

    await fetchResource(config)

    expect(mockFetch).toBeCalledWith(dummyBaseUrl + config.request.endpoint, {
      body: undefined,
      method: 'GET',
      timeout: dummyTimeout,
      headers: {},
    })
  })

  it('calls fetch with headers when there are headers in the request config', async () => {
    const { dummyBaseUrl, dummyTimeout, fetchResource, mockFetch, mockResponse } = createTestDeps()
    const headers = { [randomString('key')]: randomString('value') }
    const config = new ResourceBuilder().withRequestHeaders(headers).build()
    mockFetch.mockResolvedValue(mockResponse)

    await fetchResource(config)

    expect(mockFetch).toBeCalledWith<Parameters<typeof mockFetch>>(dummyBaseUrl + config.request.endpoint, {
      body: undefined,
      method: 'GET',
      headers: headers,
      timeout: dummyTimeout,
    })
  })

  describe('request body', () => {
    it('calls fetch with the correct params when there is no request body', async () => {
      const { dummyBaseUrl, fetchResource, mockFetch, mockResponse } = createTestDeps()
      const config = new ResourceBuilder().build()
      mockFetch.mockResolvedValue(mockResponse)

      await fetchResource(config)

      expect(mockFetch).toBeCalledWith(
        dummyBaseUrl + config.request.endpoint,
        expect.objectContaining({
          method: 'GET',
          body: undefined,
        }),
      )
    })

    it('calls fetch with the correct params when there is a non-json request body', async () => {
      const { dummyBaseUrl, fetchResource, mockFetch, mockResponse } = createTestDeps()
      const body = randomString('body')
      const config = new ResourceBuilder().withRequestBody(body).build()
      mockFetch.mockResolvedValue(mockResponse)

      await fetchResource(config)

      expect(mockFetch).toBeCalledWith(
        dummyBaseUrl + config.request.endpoint,
        expect.objectContaining({
          method: 'GET',
          body,
        }),
      )
    })

    it('calls fetch with the correct params when there is a json request body', async () => {
      const { dummyBaseUrl, fetchResource, mockFetch, mockResponse } = createTestDeps()
      const config = new ResourceBuilder().withRequestBody({ allo: 'mate' }).build()
      mockFetch.mockResolvedValue(mockResponse)

      await fetchResource(config)

      expect(mockFetch).toBeCalledWith(
        dummyBaseUrl + config.request.endpoint,
        expect.objectContaining({
          method: 'GET',
          body: '{"allo":"mate"}',
        }),
      )
    })
  })

  it('throws if there is a connection error', async () => {
    const { fetchResource, mockFetch } = createTestDeps()
    const config = new ResourceBuilder().withRequestBody({ allo: 'mate' }).build()
    mockFetch.mockRejectedValue(new Error('yipes'))

    await expect(fetchResource(config)).rejects.toThrowError('yipes')
  })

  describe('when a request accept header is specified', () => {
    it('returns json when application/json is specified', async () => {
      const { fetchResource, mockFetch, mockResponse } = createTestDeps()
      const config = new ResourceBuilder().withRequestHeaders({ accept: 'application/json' }).build()
      mockResponse.json.mockResolvedValue({ some: 'json' })
      mockFetch.mockResolvedValue(mockResponse)

      const res = await fetchResource(config)

      expect(mockResponse.json).toBeCalled()
      expect(res.data).toEqual({ some: 'json' })
    })

    it('returns text when application/json is not specified', async () => {
      const { fetchResource, mockFetch, mockResponse } = createTestDeps()
      const config = new ResourceBuilder().withRequestHeaders({ accept: 'partner' }).build()
      mockResponse.text.mockResolvedValue('woah')
      mockFetch.mockResolvedValue(mockResponse)

      const res = await fetchResource(config)

      expect(mockResponse.text).toBeCalled()
      expect(res.data).toEqual('woah')
    })
  })

  describe('when a response content-type is specified', () => {
    it('returns a json object if the response application/json content-type is given', async () => {
      const { fetchResource, mockFetch, mockResponse } = createTestDeps()
      const config = new ResourceBuilder().withResponseHeaders({ 'content-type': 'application/json' }).build()
      mockResponse.json.mockResolvedValue({ some: 'json' })
      mockFetch.mockResolvedValue(mockResponse)

      const res = await fetchResource(config)

      expect(mockResponse.json).toBeCalled()
      expect(res.data).toEqual({ some: 'json' })
    })

    it('returns text when application/json is not specified', async () => {
      const { fetchResource, mockFetch, mockResponse } = createTestDeps()
      const config = new ResourceBuilder().withResponseHeaders({ 'content-type': 'omg' }).build()
      mockResponse.text.mockResolvedValue('woah')
      mockFetch.mockResolvedValue(mockResponse)

      const res = await fetchResource(config)

      expect(mockResponse.text).toBeCalled()
      expect(res.data).toEqual('woah')
    })
  })

  describe('when a request accept and response content-type are both unspecified', () => {
    it('returns an object if the response can be parsed as JSON', async () => {
      const { fetchResource, mockFetch, mockResponse } = createTestDeps()
      const config = new ResourceBuilder().withResponseBody({ allo: 'mate' }).withResponseHeaders({}).build()
      mockResponse.text.mockResolvedValue('{ "allo": "mate" }')
      mockFetch.mockResolvedValue(mockResponse)

      const res = await fetchResource(config)

      expect(res.data).toEqual({ allo: 'mate' })
    })

    it('returns a string if the data cannot be parsed as json', async () => {
      const { fetchResource, mockFetch, mockResponse } = createTestDeps()
      const expectedData = '{ "allo: "mate" }'
      const config = new ResourceBuilder().withResponseBody(expectedData).withResponseHeaders({}).build()
      mockResponse.text.mockResolvedValue(expectedData)
      mockFetch.mockResolvedValue(mockResponse)

      const res = await fetchResource(config)

      expect(mockResponse.text).toBeCalled()
      expect(res.data).toEqual(expectedData)
    })
  })
})
