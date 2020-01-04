import { mapTestRequestConfig, mapServeRequestConfig, RequestConfig } from './request'
import * as _io from '../io'
import { mockObj } from '../test-helpers'

jest.mock('../io')

const combinedConfig = {
  method: 'POST',
  endpoints: ['/endpoint1'],
  type: 'object',
  bodyPath: './response.json',
  serveEndpoint: '/serve-endpoint',
}

describe('mapTestRequestConfig', () => {
  const { readJsonAsync } = mockObj(_io)

  afterEach(() => jest.resetAllMocks())

  it('maps a basic config correctly', async () => {
    const rawConfig = {
      method: 'POST',
      endpoints: ['/endpoint1', '/endpoint2'],
      type: 'string',
      body: 'hello world',
    }

    const mappedConfigs = await mapTestRequestConfig(rawConfig)

    expect(mappedConfigs.length).toBe(2)
    expect(mappedConfigs[0]).toMatchObject<RequestConfig>({
      endpoint: '/endpoint1',
      body: 'hello world',
      method: 'POST',
      type: 'string',
    })
  })

  it('maps body when a bodyPath is given', async () => {
    const rawConfig = {
      method: 'POST',
      endpoints: ['/endpoint1'],
      type: 'object',
      bodyPath: './response.json',
    }

    readJsonAsync.mockResolvedValue({ hello: 'world' })

    const mappedConfig = (await mapTestRequestConfig(rawConfig))[0]

    expect(readJsonAsync).toHaveBeenCalledWith('./response.json')
    expect(mappedConfig.body).toEqual({ hello: 'world' })
  })

  it('does not throw for config that contains serve settings', async () => {
    await expect(mapTestRequestConfig(combinedConfig)).resolves.not.toThrowError()
  })
})

describe('mapMockRequestConfig', () => {
  const { readJsonAsync } = mockObj(_io)

  afterEach(() => jest.resetAllMocks())

  it('maps a basic config correctly', async () => {
    const rawConfig = {
      method: 'GET',
      endpoints: ['/endpoint1'],
      type: 'MyType',
      body: 'silly',
    }

    const mappedConfig = (await mapServeRequestConfig(rawConfig))[0]

    expect(mappedConfig.body).toBe('silly')
    expect(mappedConfig.endpoint).toBe('/endpoint1')
    expect(mappedConfig.method).toBe('GET')
    expect(mappedConfig.type).toBe('MyType')
  })

  it('maps endpoints when serveEndpoint is given', async () => {
    const rawConfig = {
      method: 'GET',
      serveEndpoint: '/serve-endpoint',
      type: 'MyType',
      body: 'silly',
    }

    const mappedConfig = (await mapServeRequestConfig(rawConfig))[0]

    expect(mappedConfig.body).toBe('silly')
    expect(mappedConfig.endpoint).toBe('/serve-endpoint')
    expect(mappedConfig.method).toBe('GET')
    expect(mappedConfig.type).toBe('MyType')
  })

  it('maps body when a serveBodyPath is given', async () => {
    const rawConfig = {
      method: 'GET',
      endpoints: ['/endpoint1'],
      type: 'MyType',
      serveBodyPath: './silly.json',
    }

    readJsonAsync.mockResolvedValue({ silly: 'billy' })

    const mappedConfig = (await mapServeRequestConfig(rawConfig))[0]

    expect(readJsonAsync).toHaveBeenCalledWith('./silly.json')
    expect(mappedConfig.body).toStrictEqual({ silly: 'billy' })
  })

  it('maps body when a serveBody is given', async () => {
    const rawConfig = {
      method: 'GET',
      endpoints: ['/endpoint1'],
      type: 'MyType',
      serveBody: 'silly',
    }

    readJsonAsync.mockResolvedValue({ silly: 'billy' })

    const mappedConfig = (await mapServeRequestConfig(rawConfig))[0]

    expect(mappedConfig.body).toBe('silly')
  })

  it('maps body when a bodyPath is given', async () => {
    const rawConfig = {
      method: 'GET',
      endpoints: ['/endpoint1'],
      type: 'MyType',
      bodyPath: './silly.json',
    }

    readJsonAsync.mockResolvedValue({ silly: 'billy' })

    const mappedConfig = (await mapServeRequestConfig(rawConfig))[0]

    expect(readJsonAsync).toHaveBeenCalledWith('./silly.json')
    expect(mappedConfig.body).toStrictEqual({ silly: 'billy' })
  })

  it('does not throw for config that contains serve settings', async () => {
    await expect(mapServeRequestConfig(combinedConfig)).resolves.not.toThrowError()
  })
})
