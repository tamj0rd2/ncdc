import { mapTestResponseConfig, ResponseConfig } from './response'
import { OutgoingHttpHeaders } from 'http'
import * as _io from '../io'
import { mockObj } from '../test-helpers'

jest.mock('../io')

const { readJsonAsync } = mockObj(_io)

describe('mapTestResponseConfig', () => {
  it('maps a basic config', async () => {
    const rawConfig = {
      code: 200,
    }

    const mappedConfig = await mapTestResponseConfig(rawConfig)

    expect(mappedConfig).toMatchObject<ResponseConfig>({ code: 200 })
  })

  it('maps the type when supplied', async () => {
    const rawConfig = {
      code: 200,
      type: 'MyType',
    }

    const mappedConfig = await mapTestResponseConfig(rawConfig)

    expect(mappedConfig).toMatchObject<ResponseConfig>({
      code: 200,
      type: 'MyType',
    })
  })

  it('maps bodyPath to body when supplied', async () => {
    const rawConfig = {
      code: 200,
      bodyPath: './response.json',
    }
    readJsonAsync.mockResolvedValue('the body')

    const mappedConfig = await mapTestResponseConfig(rawConfig)

    expect(mappedConfig).toMatchObject<ResponseConfig>({
      code: 200,
      body: 'the body',
    })
  })

  it('maps valid headers', async () => {
    const rawConfig = {
      code: 200,
      headers: {
        header1: 'value1',
        header2: 2,
        header3: ['woah', 'dude'],
        header4: undefined,
      },
    }

    const mappedConfig = await mapTestResponseConfig(rawConfig)

    expect(mappedConfig.headers).toMatchObject<OutgoingHttpHeaders>({
      header1: 'value1',
      header2: 2,
      header3: ['woah', 'dude'],
      header4: undefined,
    })
  })

  const invalidHeaderCases: object[][] = [
    [{ key: true }],
    [{ key: [123, 'abc'] }],
    [{ key: [123, false] }],
    [{ key: { hello: 'world' } }],
  ]

  it.each(invalidHeaderCases)('throws an error when headers are invalid %s', async headers => {
    const config = {
      code: 123,
      headers,
    }

    await expect(mapTestResponseConfig(config)).rejects.toThrowError('headers.key should be of type:')
  })
})
