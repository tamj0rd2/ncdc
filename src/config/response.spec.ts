import { mapTestResponseConfig, ResponseConfig, mapServeResponseConfig } from './response'
import { OutgoingHttpHeaders } from 'http'
import * as _io from '../io'
import { mockObj } from '../test-helpers'

jest.mock('../io')

const { readJsonAsync } = mockObj(_io)

const combinedConfigCases: object[][] = [
  [
    {
      code: 200,
      type: 'object',
      bodyPath: './request.json',
      headers: { header1: 'blah ' },
    },
  ],
  [
    {
      code: 200,
      type: 'object',
      serveBody: ':D',
      headers: { header1: 'blah ' },
    },
  ],
  [
    {
      code: 200,
      type: 'object',
      serveBodyPath: './request.json',
      headers: { header1: 'blah ' },
    },
  ],
]

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
      headers: { header1: 'yo' },
    }

    const mappedConfig = await mapTestResponseConfig(rawConfig)

    expect(mappedConfig).toMatchObject<ResponseConfig>({
      code: 200,
      type: 'MyType',
      headers: { header1: 'yo' },
    })
  })

  it('maps bodyPath to body when supplied', async () => {
    const rawConfig = {
      code: 200,
      bodyPath: './response.json',
    }
    readJsonAsync.mockResolvedValue('the body')

    const mappedConfig = await mapTestResponseConfig(rawConfig)

    expect(readJsonAsync).toHaveBeenCalledWith('./response.json')
    expect(mappedConfig).toMatchObject<ResponseConfig>({
      code: 200,
      body: 'the body',
    })
  })

  it.each(combinedConfigCases)(
    'does not throw for config that contains test settings',
    async combinedConfig => {
      await expect(mapTestResponseConfig(combinedConfig)).resolves.not.toThrowError()
    },
  )
})

describe('mapServeResponseConfig', () => {
  it('maps a basic config', async () => {
    const rawConfig = {
      code: 200,
      body: 'boday',
      type: 'MyType',
      headers: { header1: 'yo' },
    }

    const mappedConfig = await mapServeResponseConfig(rawConfig)

    expect(mappedConfig).toMatchObject<ResponseConfig>({
      code: 200,
      body: 'boday',
      type: 'MyType',
      headers: { header1: 'yo' },
    })
  })

  it('maps bodyPath to body when supplied', async () => {
    const rawConfig = {
      code: 200,
      bodyPath: './response.json',
    }
    readJsonAsync.mockResolvedValue('the body')

    const mappedConfig = await mapServeResponseConfig(rawConfig)

    expect(readJsonAsync).toHaveBeenCalledWith('./response.json')
    expect(mappedConfig).toMatchObject<ResponseConfig>({
      code: 200,
      body: 'the body',
    })
  })

  it('maps serveBody to body when supplied', async () => {
    const rawConfig = {
      code: 200,
      serveBody: 'woah son',
    }
    const mappedConfig = await mapServeResponseConfig(rawConfig)

    expect(mappedConfig).toMatchObject<ResponseConfig>({
      code: 200,
      body: 'woah son',
    })
  })

  it('maps serveBodyPath to body when supplied', async () => {
    const rawConfig = {
      code: 200,
      serveBodyPath: './response.json',
    }
    readJsonAsync.mockResolvedValue('the body')

    const mappedConfig = await mapServeResponseConfig(rawConfig)

    expect(readJsonAsync).toHaveBeenCalledWith('./response.json')
    expect(mappedConfig).toMatchObject<ResponseConfig>({
      code: 200,
      body: 'the body',
    })
  })

  it.each(combinedConfigCases)(
    'does not throw for config that contains test settings',
    async combinedConfig => {
      await expect(mapServeResponseConfig(combinedConfig)).resolves.not.toThrowError()
    },
  )
})
