import { ConfigBuilder } from '~config/types'
import { createHttpClient, LoaderResponse } from './http-client'
import { randomString, mocked, mockObj, mockFn } from '~test-helpers'
import fetch, { Response } from 'node-fetch'

jest.unmock('./http-client')

describe('http client', () => {
  const mockedFetch = mocked(fetch)
  const mockedJson = mockFn<Response['json']>()
  const mockedText = mockFn<Response['text']>()

  const baseUrl = randomString('base-url')

  const fetchResource = createHttpClient(baseUrl)

  beforeEach(() => {
    jest.resetAllMocks()
    mockedFetch.mockResolvedValue(
      mockObj<Response>({ json: mockedJson, text: mockedText }),
    )
  })

  it('calls fetch with the correct params', async () => {
    const config = new ConfigBuilder().withEndpoint('/spanners/for/days').build()

    await fetchResource(config)

    expect(mockedFetch).toBeCalledWith(baseUrl + config.request.endpoint, {
      body: undefined,
      method: 'GET',
    })
  })

  it('calls fetch with headers when there are headers in the request config', async () => {
    const headers = { [randomString('key')]: randomString('value') }
    const config = new ConfigBuilder().withRequestHeaders(headers).build()

    await fetchResource(config)

    expect(mockedFetch).toBeCalledWith<Parameters<typeof mockedFetch>>(baseUrl + config.request.endpoint, {
      body: undefined,
      method: 'GET',
      headers: headers,
    })
  })

  describe('request body', () => {
    it('calls fetch with the correct params when there is no request body', async () => {
      const config = new ConfigBuilder().build()

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
      const config = new ConfigBuilder().withRequestBody(body).build()

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
      const config = new ConfigBuilder().withRequestBody({ allo: 'mate' }).build()

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

  it.todo('throws an error if there is a connection error')
  it('returns status 0 if there is a connection error', async () => {
    const config = new ConfigBuilder().withRequestBody({ allo: 'mate' }).build()
    mockedFetch.mockRejectedValue(new Error('yipes'))

    const res = await fetchResource(config)

    expect(res).toEqual<LoaderResponse>({ status: 0 })
  })

  describe('when a request accept header is specified', () => {
    it('returns json when application/json is specified', async () => {
      const config = new ConfigBuilder().withRequestHeaders({ accept: 'application/json' }).build()
      mockedJson.mockResolvedValue({ some: 'json' })

      const res = await fetchResource(config)

      expect(mockedJson).toBeCalled()
      expect(res.data).toEqual({ some: 'json' })
    })

    it('returns text when application/json is not specified', async () => {
      const config = new ConfigBuilder().withRequestHeaders({ accept: 'partner' }).build()
      mockedText.mockResolvedValue('woah')

      const res = await fetchResource(config)

      expect(mockedText).toBeCalled()
      expect(res.data).toEqual('woah')
    })
  })

  describe('when a response content-type is specified', () => {
    it('returns a json object if the response application/json content-type is given', async () => {
      const config = new ConfigBuilder().withResponseHeaders({ 'content-type': 'application/json' }).build()
      mockedJson.mockResolvedValue({ some: 'json' })

      const res = await fetchResource(config)

      expect(mockedJson).toBeCalled()
      expect(res.data).toEqual({ some: 'json' })
    })

    it('returns text when application/json is not specified', async () => {
      const config = new ConfigBuilder().withResponseHeaders({ 'content-type': 'omg' }).build()
      mockedText.mockResolvedValue('woah')

      const res = await fetchResource(config)

      expect(mockedText).toBeCalled()
      expect(res.data).toEqual('woah')
    })
  })

  describe('when a request accept and response content-type are both unspecified', () => {
    it('returns an object if the response can be parsed as JSON', async () => {
      const config = new ConfigBuilder()
        .withResponseBody('{ "allo": "mate" }')
        .withResponseHeaders({})
        .build()
      const expectedData = { allo: 'mate' }
      mockedJson.mockResolvedValue(expectedData)

      const res = await fetchResource(config)

      expect(mockedJson).toBeCalled()
      expect(res.data).toEqual(expectedData)
    })

    it('returns a string if the data cannot be parsed as json', async () => {
      const expectedData = '{ "allo: "mate" }'
      const config = new ConfigBuilder().withResponseBody(expectedData).withResponseHeaders({}).build()
      mockedJson.mockRejectedValue(new Error('yikes'))
      mockedText.mockResolvedValue(expectedData)

      const res = await fetchResource(config)

      expect(mockedJson).toBeCalled()
      expect(mockedText).toBeCalled()
      expect(res.data).toEqual(expectedData)
    })
  })
})
