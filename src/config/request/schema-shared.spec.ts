import { baseRequestSchema } from './schema-shared'

jest.unmock('./schema-shared')
jest.unmock('../methods')
jest.unmock('yup')

describe('baseRequestSchema', () => {
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
        method: 'POST',
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
    const result = await baseRequestSchema.validate(rawConfig)

    expect(result).toMatchObject(rawConfig)
  })

  it('throws when there are unknown keys', async () => {
    const rawConfig = {
      method: 'GET',
      to: 'the choppa',
    }

    await expect(baseRequestSchema.validate(rawConfig)).rejects.toThrowError()
  })

  it('throws when type contains spaces', async () => {
    const rawConfig = { method: 'GET', type: 'My Type' }

    await expect(baseRequestSchema.validate(rawConfig)).rejects.toThrowError()
  })

  it('throws when config is undefined', async () => {
    await expect(baseRequestSchema.validate(undefined)).rejects.toThrowError()
  })

  it('throws when config is empty', async () => {
    await expect(baseRequestSchema.validate({})).rejects.toThrowError()
  })
})
