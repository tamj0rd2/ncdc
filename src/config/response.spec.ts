import { ResponseConfig, mapResponseConfig } from './response'
import * as _io from '../io'
import { mockObj } from '../test-helpers'
import { Mode } from './config'
import TypeValidator from '../validation/type-validator'
import Problem, { ProblemType } from '../problem'

jest.mock('../io')

const { readJsonAsync } = mockObj(_io)

describe('mapResponseConfig', () => {
  afterEach(() => jest.resetAllMocks())

  const typeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })

  it('maps a basic config', async () => {
    const rawConfig = {
      code: 200,
      type: 'MyType',
      body: 'boday',
      headers: { header1: 'yo' },
    }

    const mappedConfig = await mapResponseConfig(rawConfig, typeValidator, Mode.Test)

    expect(mappedConfig).toMatchObject<ResponseConfig>({
      code: 200,
      body: 'boday',
      headers: { header1: 'yo' },
    })
  })

  it('maps bodyPath to body when supplied', async () => {
    const rawConfig = {
      code: 200,
      bodyPath: './response.json',
    }
    readJsonAsync.mockResolvedValue('the body')

    const mappedConfig = await mapResponseConfig(rawConfig, typeValidator, Mode.Test)

    expect(readJsonAsync).toHaveBeenCalledWith('./response.json')
    expect(mappedConfig).toMatchObject<ResponseConfig>({
      code: 200,
      body: 'the body',
    })
  })

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

  it.each(combinedConfigCases)(
    'does not throw for config that contains test settings',
    async combinedConfig => {
      await expect(mapResponseConfig(combinedConfig, typeValidator, Mode.Test)).resolves.not.toThrowError()
      await expect(mapResponseConfig(combinedConfig, typeValidator, Mode.Serve)).resolves.not.toThrowError()
    },
  )

  describe('serve specific mappings', () => {
    it('maps bodyPath to body when supplied', async () => {
      const rawConfig = {
        code: 200,
        bodyPath: './response.json',
      }
      readJsonAsync.mockResolvedValue('the body')

      const mappedConfig = await mapResponseConfig(rawConfig, typeValidator, Mode.Serve)

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
      const mappedConfig = await mapResponseConfig(rawConfig, typeValidator, Mode.Serve)

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

      const mappedConfig = await mapResponseConfig(rawConfig, typeValidator, Mode.Serve)

      expect(readJsonAsync).toHaveBeenCalledWith('./response.json')
      expect(mappedConfig).toMatchObject<ResponseConfig>({
        code: 200,
        body: 'the body',
      })
    })
  })

  describe('when any body key and type are both given', () => {
    it('calls the type validator with the correct args', async () => {
      const rawConfig = {
        code: 200,
        type: 'MyCoolType',
        bodyPath: './request.json',
      }

      const mappedBody = { hello: 'world' }
      readJsonAsync.mockResolvedValue(mappedBody)

      await mapResponseConfig(rawConfig, typeValidator, Mode.Test)

      expect(typeValidator.getProblems).toHaveBeenCalledWith(mappedBody, 'MyCoolType', ProblemType.Response)
    })

    it('throws when the mapped body does not match the type', async () => {
      const rawConfig = {
        code: 200,
        type: 'MyCoolType',
        bodyPath: './request.json',
      }

      const mappedBody = { hello: 'world' }
      readJsonAsync.mockResolvedValue(mappedBody)
      typeValidator.getProblems.mockResolvedValue([{} as Problem])

      await expect(mapResponseConfig(rawConfig, typeValidator, Mode.Test)).rejects.toThrowError()
    })
  })
})
