import { ResponseConfig, mapResponseConfig, ResponseSchema } from './response'
import { mockObj, mockFn } from '~test-helpers'
import { TypeValidator } from '~validation'
import Problem, { ProblemType } from '~problem'
import { GetBodyToUse } from './body'

describe('mapResponseConfig', () => {
  const typeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })
  const getBodyToUse = mockFn<GetBodyToUse>()

  beforeEach(() => {
    getBodyToUse.mockResolvedValue('default body for tests')
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('maps a basic config', async () => {
    const rawConfig = {
      code: 200,
      type: 'MyType',
      body: 'boday',
      headers: { header1: 'yo' },
    }

    const mappedConfig = await mapResponseConfig(rawConfig, typeValidator, getBodyToUse)

    expect(mappedConfig).toMatchObject<ResponseConfig>({
      code: 200,
      type: 'MyType',
      body: 'default body for tests',
      headers: { header1: 'yo' },
    })
  })

  const combinedConfigCases: [ResponseSchema][] = [
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
      await expect(mapResponseConfig(combinedConfig, typeValidator, getBodyToUse)).resolves.not.toThrowError()
      await expect(mapResponseConfig(combinedConfig, typeValidator, getBodyToUse)).resolves.not.toThrowError()
    },
  )

  describe('when any body key and type are both given', () => {
    it('calls the type validator with the correct args', async () => {
      const rawConfig = {
        code: 200,
        type: 'MyCoolType',
        bodyPath: './request.json',
      }

      const mappedBody = { hello: 'world' }
      getBodyToUse.mockResolvedValue(mappedBody)

      await mapResponseConfig(rawConfig, typeValidator, getBodyToUse)

      expect(typeValidator.getProblems).toHaveBeenCalledWith(mappedBody, 'MyCoolType', ProblemType.Response)
    })

    it('throws when the mapped body does not match the type', async () => {
      const rawConfig = {
        code: 200,
        type: 'MyCoolType',
        bodyPath: './request.json',
      }

      const mappedBody = { hello: 'world' }
      getBodyToUse.mockResolvedValue(mappedBody)
      typeValidator.getProblems.mockResolvedValue([{} as Problem])

      await expect(mapResponseConfig(rawConfig, typeValidator, getBodyToUse)).rejects.toThrowError()
    })
  })
})
