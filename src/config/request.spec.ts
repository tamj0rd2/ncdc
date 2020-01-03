import { testRequestSchema, serveRequestSchema } from './request'

const cases: (string | string[])[] = ['/endpoint1', ['/endpoint1', '/endpoint2']]

it.each(cases)('does not throw for a valid Test request config %s', endpoints => {
  const config = {
    method: 'POST',
    endpoints,
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
    type: 'string',
    mockBody: 'hello world',
    serveEndpoint: '/api/hello',
  }

  expect(() => serveRequestSchema.validateSync(config)).not.toThrowError()
})
