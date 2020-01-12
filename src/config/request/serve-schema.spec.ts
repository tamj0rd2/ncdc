import { serveRequestSchema } from './serve-schema'
import { RequestSchema } from '.'

jest.enableAutomock()
jest.unmock('./serve-schema')
jest.unmock('./schema-shared')
jest.unmock('../methods')
jest.unmock('yup')

describe('serveRequestSchema', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('accepts and transforms a single endpoint', async () => {
    const rawConfig = {
      method: 'POST',
      endpoints: '/yo',
    }

    const result = await serveRequestSchema.validate(rawConfig)

    expect(result).toMatchObject<RequestSchema>({ method: 'POST', endpoints: ['/yo'] })
  })
})
