import { getTestSchema } from './test-schema'
import { RequestSchema } from '.'

jest.unmock('./test-schema')
jest.unmock('./schema-shared')

describe('getTestSchema', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('accepts and transforms a single endpoint', async () => {
    const rawConfig = {
      method: 'POST',
      endpoints: '/yo',
    }

    const result = await getTestSchema(false).validate(rawConfig)

    expect(result).toMatchObject<RequestSchema>({ method: 'POST', endpoints: ['/yo'] })
  })

  it('throws when serveOnly is false and endpoints are missing', async () => {
    const rawConfig = {
      method: 'GET',
    }

    await expect(getTestSchema(false).validate(rawConfig)).rejects.toThrowError('endpoints')
  })

  it('does not throw when serveOnly is true and endpoints are missing', async () => {
    const rawConfig = {
      method: 'GET',
    }

    await expect(getTestSchema(true).validate(rawConfig)).resolves.not.toThrowError()
  })

  it('does not throw when given ignored keys', async () => {
    const rawConfig = {
      method: 'GET',
      endpoints: ['/me'],
      serveEndpoint: 'wot',
      serveBody: 'the',
      serveBodyPath: 'hell',
    }

    const result = await getTestSchema(false).validate(rawConfig)

    expect(result).toStrictEqual<RequestSchema>({
      method: 'GET',
      endpoints: ['/me'],
    })
  })
})
