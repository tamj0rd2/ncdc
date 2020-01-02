import { testRequestSchema, ServeRequestConfig, TestRequestConfig } from './request'

describe('Test config', () => {
  it('is invalid with empty config', () => {
    const config = {}

    expect(() => testRequestSchema.validateSync(config)).toThrowError()
  })

  it('validates the most basic config', () => {
    const config = {
      method: 'POST',
      endpoint: '/api/hello',
    }

    expect(() => testRequestSchema.validateSync(config)).not.toThrowError()
  })

  it('is invalid when a supported method is not used', () => {
    const config = {
      method: 'HOST',
      endpoint: '/api/hello',
    }

    expect(() => testRequestSchema.validateSync(config)).toThrowError()
  })

  it('allows params as a list of strings or 2d list of strings', () => {
    const config = {
      method: 'GET',
      endpoint: '/api/hello',
      params: ['param1', 'param2', ['param 3.1', 'param 3.2'], 'param 4'],
    }

    expect(() => testRequestSchema.validateSync(config)).not.toThrowError()
  })

  it('allows a body', () => {
    const config = {
      method: 'GET',
      endpoint: '/api/hello',
      body: 'bodaaay',
    }

    expect(() => testRequestSchema.validateSync(config)).not.toThrowError()
  })

  it('allows a type', () => {
    const config = {
      method: 'GET',
      endpoint: '/api/hello',
      type: 'typing tom',
    }

    expect(() => testRequestSchema.validateSync(config)).not.toThrowError()
  })

  it('does not allow unspecified keys', () => {
    const config = {
      method: 'GET',
      endpoint: 'derp',
      hello: 'mellow',
    }

    expect(() => testRequestSchema.validateSync(config)).toThrowError()
  })

  it('is still valid even if mock config keys are given', () => {
    const config: TestRequestConfig & ServeRequestConfig = {
      method: 'GET',
      endpoint: 'derp',
      params: ['a', 'b', ['c', 'd']],
      body: 123,
      type: 'typing tom',
      serveEndpoint: 'eek',
    }

    expect(() => testRequestSchema.validateSync(config)).not.toThrowError()
  })
})

describe('mock config', () => {})
