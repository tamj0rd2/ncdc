import { getServeSchema } from './serve-schema'
import { RequestSchema } from '.'

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

    const result = await getServeSchema().validate(rawConfig)

    expect(result).toMatchObject<RequestSchema>({ method: 'POST', endpoints: ['/yo'] })
  })
})
