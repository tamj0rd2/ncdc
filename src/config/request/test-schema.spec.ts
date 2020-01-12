import { testRequestSchema } from './test-schema'
import { RequestSchema } from '~config/request'

jest.enableAutomock()
jest.unmock('./test-schema')
jest.unmock('../methods')
jest.unmock('yup')

describe('testRequestSchema', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  const basicCases: [object][] = [
    [
      {
        method: 'GET',
        endpoints: ['/endpoint1'],
        type: 'MyType',
        body: 'Somebody',
      },
    ],
    [
      {
        method: 'POST',
        endpoints: ['/endpoint2'],
        type: 'MyType',
        bodyPath: './somePath',
        headers: {},
      },
    ],
    [
      {
        method: 'GET',
        endpoints: ['/endpoint3', '/endpoint4'],
        headers: {
          header1: ':O',
          header2: 'woah',
        },
      },
    ],
  ]

  it.each(basicCases)('does not throw when given the config %o', async rawConfig => {
    const result = await testRequestSchema.validate(rawConfig)

    expect(result).toMatchObject({ serveOnly: false, ...rawConfig })
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

  it('throws when there are unknown keys', async () => {
    const rawConfig = {
      method: 'GET',
      to: 'the choppa',
    }

    await expect(testRequestSchema.validate(rawConfig)).rejects.toThrowError()
  })

  it('throws when type contains spaces', async () => {
    const rawConfig = { method: 'GET', type: 'My Type' }

    await expect(testRequestSchema.validate(rawConfig)).rejects.toThrowError()
  })

  it('throws when config is undefined', async () => {
    await expect(testRequestSchema.validate(undefined)).rejects.toThrowError()
  })

  it('throws when config is empty', async () => {
    await expect(testRequestSchema.validate({})).rejects.toThrowError()
  })
})
