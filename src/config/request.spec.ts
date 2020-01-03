import { testRequestSchema, serveRequestSchema } from './request'

it('does not throw for a valid Test request config', () => {
  const config = {
    method: 'POST',
    endpoint: '/api/hello?target=world',
    params: [],
    type: 'string',
    body: 'hello world',
    serveEndpoint: '/api/hello',
  }

  expect(() => testRequestSchema.validateSync(config)).not.toThrowError()
})

it('does not throw for a valid Serve request config', () => {
  const config = {
    method: 'POST',
    endpoint: '/api/hello?target=world',
    params: [],
    type: 'string',
    mockBody: 'hello world',
    serveEndpoint: '/api/hello',
  }

  expect(() => serveRequestSchema.validateSync(config)).not.toThrowError()
})
