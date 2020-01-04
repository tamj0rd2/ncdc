import { mapTestRequestConfig, serveRequestSchema } from './request'
import * as _io from '../io'
import { mockObj } from '../test-helpers'

jest.mock('../io')

describe('TestRequestConfig', () => {
  const { readJsonAsync } = mockObj(_io)

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

  it('maps body when a body path is given', async () => {
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

it('does not throw for a valid Serve request config', () => {
  const config = {
    method: 'POST',
    endpoint: '/api/hello?target=world',
    serveEndpoint: '/api/hello',
    type: 'string',
    mockBody: 'hello world',
  }

  expect(() => serveRequestSchema.validateSync(config)).not.toThrowError()
})
