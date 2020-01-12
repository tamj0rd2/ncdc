import { testRequestSchema } from './test-schema'
import { RequestSchema } from '~config/request'

jest.enableAutomock()
jest.unmock('./test-schema')
jest.unmock('./schema-shared')
jest.unmock('../methods')
jest.unmock('yup')

describe('testRequestSchema', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('accepts and transforms a single endpoint', async () => {
    const rawConfig = {
      method: 'POST',
      endpoints: '/yo',
    }

    const result = await testRequestSchema.validate(rawConfig)

    expect(result).toMatchObject<RequestSchema>({ method: 'POST', endpoints: ['/yo'], serveOnly: false })
  })

  it('does not throw when given ignored keys', async () => {
    const rawConfig = {
      method: 'GET',
      endpoints: ['/me'],
      serveEndpoint: 'wot',
      serveBody: 'the',
      serveBodyPath: 'hell',
    }

    const result = await testRequestSchema.validate(rawConfig)

    expect(result).toStrictEqual<RequestSchema>({
      method: 'GET',
      endpoints: ['/me'],
      serveOnly: false,
    })
  })
})
