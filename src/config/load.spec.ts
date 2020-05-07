import { mocked, randomString, mockObj, mockFn } from '~test-helpers'
import { readYamlAsync } from '~io'
import { resolve, isAbsolute } from 'path'
import { CommonConfig } from './types'
import loadConfig, { LoadConfigResponse, TransformConfigs, GetTypeValidator, LoadConfigStatus } from './load'
import { TypeValidator } from '~validation'
import { validateRawConfig, ValidatedRawConfig, validateConfigBodies } from './validate'

jest.unmock('./load')
jest.mock('path')

describe('loadConfig', () => {
  const mockReadYamlAsync = mocked(readYamlAsync)
  const mockResolve = mocked(resolve)
  const mockValidate = mocked(validateRawConfig)
  const mockValidateBodies = mocked(validateConfigBodies)
  const mockTransformConfigs = mockFn<TransformConfigs<unknown>>()
  const mockTypeValidator = mockObj<TypeValidator>({ validate: jest.fn() })
  const mockCreateTypeValidator = mockFn<GetTypeValidator>()
  const mockIsAbsolute = mocked(isAbsolute)

  const configPath = randomString('configPath')
  const transformedConfigDummy = { name: randomString('name'), request: {}, response: {} } as CommonConfig
  const act = async (): Promise<LoadConfigResponse> =>
    loadConfig(configPath, mockCreateTypeValidator, mockTransformConfigs)

  beforeEach(() => {
    jest.resetAllMocks()
    mockValidate.mockReturnValue({ success: true, validatedConfigs: [] })
    mockTransformConfigs.mockResolvedValue([transformedConfigDummy])
    mockCreateTypeValidator.mockReturnValue(mockTypeValidator)
  })

  it('calls readYamlAsync with the correct config path', async () => {
    const resolvedPath = 'wot m8'
    mockResolve.mockReturnValue(resolvedPath)

    await act()

    expect(mockResolve).toBeCalledWith(configPath)
    expect(mockReadYamlAsync).toBeCalledWith(resolvedPath)
  })

  it('returns a failure response when readYamlAsync fails', async () => {
    mockReadYamlAsync.mockRejectedValue(new Error('that aint right'))

    const result = await act()

    expect(result).toStrictEqual<LoadConfigResponse>({
      type: LoadConfigStatus.ProblemReadingConfig,
      message: 'There was a problem reading your config file:\n\nthat aint right',
    })
  })

  it('calls validate with the correct args', async () => {
    const rawConfigs: unknown[] = [{ name: 'My Raw Config' }]
    mockReadYamlAsync.mockResolvedValue(rawConfigs)

    await act()

    expect(mockValidate).toBeCalledWith(rawConfigs)
  })

  it('returns a failure response when config validation fails', async () => {
    const errors = [randomString(), randomString()]
    mockValidate.mockReturnValue({ success: false, errors })

    const result = await act()

    expect(result).toStrictEqual<LoadConfigResponse>({
      type: LoadConfigStatus.InvalidConfig,
      message: `Your config file is invalid:\n\n${errors[0]}\n${errors[1]}`,
    })
  })

  it('returns a warning response if there are no validated configs returned', async () => {
    mockValidate.mockReturnValue({ success: true, validatedConfigs: [] })

    const result = await act()

    expect(result).toStrictEqual<LoadConfigResponse>({ type: LoadConfigStatus.NoConfigs })
  })

  it('does not create a type validator if no configs have associated types', async () => {
    mockValidate.mockReturnValue({ success: true, validatedConfigs: [{ request: {}, response: {} }] })

    await act()

    expect(mockCreateTypeValidator).not.toBeCalled()
  })

  it('calls the transform func with the correct args', async () => {
    const validatedConfigs = [{ request: {}, response: {} }]
    mockValidate.mockReturnValue({ success: true, validatedConfigs })
    const absoulteConfigPath = randomString()
    mockResolve.mockReturnValue(absoulteConfigPath)

    await act()

    expect(mockTransformConfigs).toBeCalledWith(validatedConfigs, absoulteConfigPath)
  })

  it('creates a type validator with the correct args when types are present in any config', async () => {
    mockValidate.mockReturnValue({
      success: true,
      validatedConfigs: [{ request: {}, response: {} }],
    })
    mockTransformConfigs.mockResolvedValue([
      { request: { type: randomString() }, response: {} } as CommonConfig,
    ])

    await act()

    expect(mockCreateTypeValidator).toBeCalled()
  })

  it('returns a failure response is there are body validation issues', async () => {
    mockValidate.mockReturnValue({
      success: true,
      validatedConfigs: [{ request: {}, response: {} }],
    })
    mockTransformConfigs.mockResolvedValue([
      { request: { type: randomString() }, response: {} } as CommonConfig,
    ])
    const validationError = randomString('oops')
    mockValidateBodies.mockResolvedValue(validationError)

    const result = await act()

    expect(result).toStrictEqual<LoadConfigResponse>({
      type: LoadConfigStatus.InvalidBodies,
      message: `One or more of your configured bodies do not match the correct type:\n\n${validationError}`,
    })
  })

  describe('when everything else goes ok', () => {
    it('returns a response with configs and fixture paths', async () => {
      const fixturePath1 = randomString('fixture1')
      const fixturePath2 = randomString('fixture2')
      const fixturePath3 = randomString('fixture3')
      const expectedAbsPath = randomString('some abs path')
      const validatedConfigs: ValidatedRawConfig[] = [
        {
          request: { bodyPath: fixturePath1 },
          response: { bodyPath: fixturePath2, serveBodyPath: fixturePath3 },
        },
      ]
      mockValidate.mockReturnValue({ success: true, validatedConfigs })
      mockIsAbsolute.mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValue(true)
      mockResolve.mockReturnValue(expectedAbsPath)

      const result = await act()

      expect(result).toStrictEqual<LoadConfigResponse>({
        type: LoadConfigStatus.Success,
        absoluteFixturePaths: [fixturePath1, expectedAbsPath, fixturePath3],
        configs: [transformedConfigDummy],
      })
    })
  })
})
