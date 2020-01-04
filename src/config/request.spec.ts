import { mapTestRequestConfig, mapServeRequestConfig } from './request'
import * as _io from '../io'
import { mockObj } from '../test-helpers'

jest.mock('../io')

const { readJsonAsync } = mockObj(_io)

describe('mapTestRequestConfig', () => {
  afterEach(() => jest.resetAllMocks())

  it('maps a basic config correctly', async () => {
    const rawConfig = {
      method: 'POST',
      endpoints: ['/endpoint1', '/endpoint2'],
      type: 'string',
      body: 'hello world',
      serveEndpoint: '/api/hello',
    }

    const mappedConfig = await mapTestRequestConfig(rawConfig)

    expect(mappedConfig.body).toBe('hello world')
    expect(mappedConfig.endpoints).toStrictEqual(['/endpoint1', '/endpoint2'])
    expect(mappedConfig.method).toBe('POST')
    expect(mappedConfig.type).toBe('string')
  })

  it('maps body when a bodyPath is given', async () => {
    const rawConfig = {
      method: 'POST',
      endpoints: ['/endpoint1', '/endpoint2'],
      type: 'object',
      bodyPath: './response.json',
      serveEndpoint: '/api/hello',
    }

    readJsonAsync.mockResolvedValue({ hello: 'world' })

    const mappedConfig = await mapTestRequestConfig(rawConfig)

    expect(readJsonAsync).toHaveBeenCalledWith('./response.json')
    expect(mappedConfig.body).toEqual({ hello: 'world' })
  })
})

describe('mapMockRequestConfig', () => {
  afterEach(() => jest.resetAllMocks())

  it('maps a basic config correctly', async () => {
    const rawConfig = {
      method: 'GET',
      endpoints: ['/endpoint1'],
      type: 'MyType',
      body: 'silly',
    }

    const mappedConfig = await mapServeRequestConfig(rawConfig)

    expect(mappedConfig.body).toBe('silly')
    expect(mappedConfig.endpoints).toStrictEqual(['/endpoint1'])
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

    const mappedConfig = await mapServeRequestConfig(rawConfig)

    expect(mappedConfig.body).toBe('silly')
    expect(mappedConfig.endpoints).toStrictEqual(['/serve-endpoint'])
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

    const mappedConfig = await mapServeRequestConfig(rawConfig)

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

    const mappedConfig = await mapServeRequestConfig(rawConfig)

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

    const mappedConfig = await mapServeRequestConfig(rawConfig)

    expect(readJsonAsync).toHaveBeenCalledWith('./silly.json')
    expect(mappedConfig.body).toStrictEqual({ silly: 'billy' })
  })
})
