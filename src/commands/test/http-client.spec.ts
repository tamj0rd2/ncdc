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

  it('returns a json object if the application/json content-type is not given', async () => {
    const config = new ConfigBuilder().withRequestBody({ allo: 'mate' }).withResponseHeaders({}).build()
    mockedText.mockResolvedValue('some text')

    const res = await fetchResource(config)

    expect(mockedText).toBeCalled()
    expect(res.data).toEqual('some text')
  })
})
