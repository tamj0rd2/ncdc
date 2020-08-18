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
  const mockValidateRawConfig = mocked(validateRawConfig)
  const mockValidateBodies = mocked(validateConfigBodies)
  const mockTransformConfigs = mockFn<TransformConfigs<unknown>>()
  const mockTypeValidator = mockObj<TypeValidator>({ validate: jest.fn() })
  const mockCreateTypeValidator = mockFn<GetTypeValidator>()
  const mockIsAbsolute = mocked(isAbsolute)

  const configPath = randomString('configPath')
  const transformedConfigDummy = { name: randomString('name'), request: {}, response: {} } as CommonConfig
  const act = async (isTestMode = false): Promise<LoadConfigResponse> =>
    loadConfig(configPath, mockCreateTypeValidator, mockTransformConfigs, isTestMode)

  beforeEach(() => {
    jest.resetAllMocks()
    mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs: [] })
    mockTransformConfigs.mockResolvedValue([transformedConfigDummy])
    mockCreateTypeValidator.mockResolvedValue(mockTypeValidator)
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

    expect(mockValidateRawConfig).toBeCalledWith(rawConfigs)
  })

  it('returns a failure response when config validation fails', async () => {
    const errors = [randomString(), randomString()]
    mockValidateRawConfig.mockReturnValue({ success: false, errors })

    const result = await act()

    expect(result).toStrictEqual<LoadConfigResponse>({
      type: LoadConfigStatus.InvalidConfig,
      message: `Your config file is invalid:\n\n${errors[0]}\n${errors[1]}`,
    })
  })

  it('returns a warning response if there are no validated configs returned', async () => {
    mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs: [] })

    const result = await act()

    expect(result).toStrictEqual<LoadConfigResponse>({ type: LoadConfigStatus.NoConfigs })
  })

  it('does not create a type validator if no configs have associated types', async () => {
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
    })

    await act()

    expect(mockCreateTypeValidator).not.toBeCalled()
  })

  it('calls the transform func with the correct args', async () => {
    const validatedConfigs = [{ serveOnly: false, request: {}, response: {} }]
    mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs })
    const absoulteConfigPath = randomString()
    mockResolve.mockReturnValue(absoulteConfigPath)

    await act()

    expect(mockTransformConfigs).toBeCalledWith(validatedConfigs, absoulteConfigPath)
  })

  it('creates a type validator with the correct args when types are present in any config', async () => {
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
    })
    mockTransformConfigs.mockResolvedValue([
      { request: { type: randomString() }, response: {} } as CommonConfig,
    ])

    await act()

    expect(mockCreateTypeValidator).toBeCalled()
  })

  it('returns a failure response is there are body validation issues', async () => {
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
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

  it('throws when there is a problem validating a body against a type', async () => {
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
    })
    mockTransformConfigs.mockResolvedValue([
      { request: {}, response: { type: randomString('some type') } } as CommonConfig,
    ])
    const errorMessage = randomString('some error message')
    mockValidateBodies.mockRejectedValue(new Error(errorMessage))

    const result = await act()

    expect(result).toStrictEqual<LoadConfigResponse>({
      type: LoadConfigStatus.BodyValidationError,
      message: `An error occurred while validating one of your configured fixtures:\n${errorMessage}`,
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
          serveOnly: false,
          request: { bodyPath: fixturePath1 },
          response: { bodyPath: fixturePath2, serveBodyPath: fixturePath3 },
        },
      ]
      mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs })
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
