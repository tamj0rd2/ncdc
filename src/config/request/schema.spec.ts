import { testRequestSchema } from './schema'

jest.enableAutomock()
jest.unmock('./schema')
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
        type: 'MyType',
        body: 'Somebody',
      },
    ],
    [
      {
        method: 'GET',
        type: 'MyType',
        bodyPath: './somePath',
        headers: {},
      },
    ],
    [
      {
        method: 'GET',
        headers: {
          header1: ':O',
          header2: 'woah',
        },
      },
    ],
  ]

  it.each(basicCases)('does not throw when given the config %o', async rawConfig => {
    const result = await testRequestSchema.validate(rawConfig)

    expect(result).toMatchObject(rawConfig)
  })

  it('does not throw when given ignored keys', async () => {
    const rawConfig = {
      method: 'GET',
      serveEndpoint: 'wot',
      serveBody: 'the',
      serveBodyPath: 'hell',
    }

    const result = await testRequestSchema.validate(rawConfig)

    expect(result).toStrictEqual({ method: 'GET' })
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
