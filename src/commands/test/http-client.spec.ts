import { ResourceBuilder } from '~config/types'
import { createHttpClient } from './http-client'
import { randomString, mocked, mockObj, mockFn, randomNumber } from '~test-helpers'
import fetch, { Response } from 'node-fetch'

jest.unmock('./http-client')

describe('http client', () => {
  const mockedFetch = mocked(fetch)
  const mockedJson = mockFn<Response['json']>()
  const mockedText = mockFn<Response['text']>()

  const baseUrl = randomString('base-url')
  const timeout = randomNumber()

  const fetchResource = createHttpClient(baseUrl, timeout)

  beforeEach(() => {
    jest.resetAllMocks()
    mockedFetch.mockResolvedValue(
      mockObj<Response>({ json: mockedJson, text: mockedText }),
    )
  })

  it('calls fetch with the correct params', async () => {
    const config = new ResourceBuilder().withEndpoint('/spanners/for/days').build()

    await fetchResource(config)

    expect(mockedFetch).toBeCalledWith(baseUrl + config.request.endpoint, {
      body: undefined,
      method: 'GET',
      timeout,
    })
  })

  it('calls fetch with headers when there are headers in the request config', async () => {
    const headers = { [randomString('key')]: randomString('value') }
    const config = new ResourceBuilder().withRequestHeaders(headers).build()

    await fetchResource(config)

    expect(mockedFetch).toBeCalledWith<Parameters<typeof mockedFetch>>(baseUrl + config.request.endpoint, {
      body: undefined,
      method: 'GET',
      headers: headers,
      timeout,
    })
  })

  describe('request body', () => {
    it('calls fetch with the correct params when there is no request body', async () => {
      const config = new ResourceBuilder().build()

      await fetchResource(config)

      expect(mockedFetch).toBeCalledWith(
        baseUrl + config.request.endpoint,
        expect.objectContaining({
          method: 'GET',
          body: undefined,
        }),
      )
    })

    it('calls fetch with the correct params when there is a non-json request body', async () => {
      const body = randomString('body')
      const config = new ResourceBuilder().withRequestBody(body).build()

      await fetchResource(config)

      expect(mockedFetch).toBeCalledWith(
        baseUrl + config.request.endpoint,
        expect.objectContaining({
          method: 'GET',
          body,
        }),
      )
    })

    it('calls fetch with the correct params when there is a json request body', async () => {
      const config = new ResourceBuilder().withRequestBody({ allo: 'mate' }).build()

      await fetchResource(config)

      expect(mockedFetch).toBeCalledWith(
        baseUrl + config.request.endpoint,
        expect.objectContaining({
          method: 'GET',
          body: '{"allo":"mate"}',
        }),
      )
    })
  })

  it('throws if there is a connection error', async () => {
    const config = new ResourceBuilder().withRequestBody({ allo: 'mate' }).build()
    mockedFetch.mockRejectedValue(new Error('yipes'))

    await expect(fetchResource(config)).rejects.toThrowError('yipes')
  })

  describe('when a request accept header is specified', () => {
    it('returns json when application/json is specified', async () => {
      const config = new ResourceBuilder().withRequestHeaders({ accept: 'application/json' }).build()
      mockedJson.mockResolvedValue({ some: 'json' })

      const res = await fetchResource(config)

      expect(mockedJson).toBeCalled()
      expect(res.data).toEqual({ some: 'json' })
    })

    it('returns text when application/json is not specified', async () => {
      const config = new ResourceBuilder().withRequestHeaders({ accept: 'partner' }).build()
      mockedText.mockResolvedValue('woah')

      const res = await fetchResource(config)

      expect(mockedText).toBeCalled()
      expect(res.data).toEqual('woah')
    })
  })

  describe('when a response content-type is specified', () => {
    it('returns a json object if the response application/json content-type is given', async () => {
      const config = new ResourceBuilder().withResponseHeaders({ 'content-type': 'application/json' }).build()
      mockedJson.mockResolvedValue({ some: 'json' })

      const res = await fetchResource(config)

      expect(mockedJson).toBeCalled()
      expect(res.data).toEqual({ some: 'json' })
    })

    it('returns text when application/json is not specified', async () => {
      const config = new ResourceBuilder().withResponseHeaders({ 'content-type': 'omg' }).build()
      mockedText.mockResolvedValue('woah')

      const res = await fetchResource(config)

      expect(mockedText).toBeCalled()
      expect(res.data).toEqual('woah')
    })
  })

  describe('when a request accept and response content-type are both unspecified', () => {
    it('returns an object if the response can be parsed as JSON', async () => {
      const config = new ResourceBuilder().withResponseBody({ allo: 'mate' }).withResponseHeaders({}).build()
      mockedText.mockResolvedValue('{ "allo": "mate" }')

      const res = await fetchResource(config)

      expect(res.data).toEqual({ allo: 'mate' })
    })

    it('returns a string if the data cannot be parsed as json', async () => {
      const expectedData = '{ "allo: "mate" }'
      const config = new ResourceBuilder().withResponseBody(expectedData).withResponseHeaders({}).build()
      mockedText.mockResolvedValue(expectedData)

      const res = await fetchResource(config)

      expect(mockedText).toBeCalled()
      expect(res.data).toEqual(expectedData)
    })
  })
})
