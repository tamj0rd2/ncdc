import ConfigBuilder from '~config/config-builder'
import { LoaderResponse } from '~validation'
import { createHttpClient } from './http-client'
import { randomString, mocked, mockObj, mockFn } from '~test-helpers'
import fetch, { Response } from 'node-fetch'

jest.unmock('./http-client')
jest.unmock('~config/config-builder')

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

  it('returns a json object if the application/json content-type is given', async () => {
    const config = new ConfigBuilder()
      .withRequestBody({ allo: 'mate' })
      .withResponseHeaders({ 'content-type': 'application/json' })
      .build()
    mockedJson.mockResolvedValue({ some: 'json' })

    const res = await fetchResource(config)

    expect(mockedJson).toBeCalled()
    expect(res.data).toEqual({ some: 'json' })
  })

  it('returns a string if the application/json content-type is not given', async () => {
    const config = new ConfigBuilder().withRequestBody({ allo: 'mate' }).withResponseHeaders({}).build()
    const expectedData = randomString('some text, does not matter what it is')
    mockedText.mockResolvedValue(expectedData)

    const res = await fetchResource(config)

    expect(mockedText).toBeCalled()
    expect(res.data).toEqual(expectedData)
  })
})
