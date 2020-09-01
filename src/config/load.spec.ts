import { mocked, randomString, mockObj, mockFn } from '~test-helpers'
import { readYamlAsync } from '~io'
import { resolve, isAbsolute } from 'path'
import { Resource } from './resource'
import loadConfig, { LoadConfigResponse, TransformResources, GetTypeValidator } from './load'
import { TypeValidator } from '~validation'
import { validateRawConfig, ValidatedRawConfig, validateConfigBodies } from './validate'
import {
  BodyValidationError,
  InvalidBodyTypeError,
  NoServiceResourcesError,
  ServiceConfigInvalidError,
  ServiceConfigReadError,
} from './errors'
import { RawConfigBuilder } from './builders'

jest.disableAutomock()
jest.mock('path')
jest.mock('./validate')
jest.mock('~io')

describe('loadConfig', () => {
  const mockReadYamlAsync = mocked(readYamlAsync)
  const mockResolve = mocked(resolve)
  const mockValidateRawConfig = mocked(validateRawConfig)
  const mockValidateBodies = mocked(validateConfigBodies)
  const mockTransformConfigs = mockFn<TransformResources<unknown>>()
  const mockTypeValidator = mockObj<TypeValidator>({ validate: jest.fn() })
  const mockCreateTypeValidator = mockFn<GetTypeValidator>()
  const mockIsAbsolute = mocked(isAbsolute)

  const configPath = randomString('configPath')
  const transformedResourceDummy = { name: randomString('name'), request: {}, response: {} } as Resource
  const tryLoadConfig = async (isTestMode = false): Promise<LoadConfigResponse> =>
    loadConfig(configPath, mockCreateTypeValidator, mockTransformConfigs, isTestMode)

  beforeEach(() => {
    mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs: [] })
    mockTransformConfigs.mockResolvedValue([transformedResourceDummy])
    mockCreateTypeValidator.mockResolvedValue(mockTypeValidator)
  })

  afterEach(() => jest.resetAllMocks())

  it('calls readYamlAsync with the correct config path', async () => {
    const resolvedPath = 'wot m8'
    mockResolve.mockReturnValue(resolvedPath)
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [RawConfigBuilder.default],
    })

    await tryLoadConfig()

    expect(mockResolve).toBeCalledWith(configPath)
    expect(mockReadYamlAsync).toBeCalledWith(resolvedPath)
  })

  it('returns a failure response when readYamlAsync fails', async () => {
    mockReadYamlAsync.mockRejectedValue(new Error('that aint right'))

    await expect(tryLoadConfig()).rejects.toThrowError(ServiceConfigReadError)
  })

  it('calls validate with the correct args', async () => {
    const rawConfigs: unknown[] = [{ name: 'My Raw Config' }]
    mockReadYamlAsync.mockResolvedValue(rawConfigs)
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [RawConfigBuilder.default],
    })

    await tryLoadConfig()

    expect(mockValidateRawConfig).toBeCalledWith(rawConfigs)
  })

  it('returns a failure response when config validation fails', async () => {
    const errors = [randomString(), randomString()]
    mockValidateRawConfig.mockReturnValue({ success: false, errors })

    await expect(tryLoadConfig()).rejects.toThrowError(ServiceConfigInvalidError)
  })

  it('returns a warning response if there are no validated configs returned', async () => {
    mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs: [] })

    await expect(tryLoadConfig()).rejects.toThrowError(NoServiceResourcesError)
  })

  it('does not create a type validator if no configs have associated types', async () => {
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
    })

    await tryLoadConfig()

    expect(mockCreateTypeValidator).not.toBeCalled()
  })

  it('calls the transform func with the correct args', async () => {
    const validatedConfigs = [{ serveOnly: false, request: {}, response: {} }]
    mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs })
    const absoulteConfigPath = randomString()
    mockResolve.mockReturnValue(absoulteConfigPath)

    await tryLoadConfig()

    expect(mockTransformConfigs).toBeCalledWith(validatedConfigs, absoulteConfigPath)
  })

  it('creates a type validator with the correct args when types are present in any config', async () => {
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
    })
    mockTransformConfigs.mockResolvedValue([{ request: { type: randomString() }, response: {} } as Resource])

    await tryLoadConfig()

    expect(mockCreateTypeValidator).toBeCalled()
  })

  it('throws an error if a body does not match the correct type', async () => {
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
    })
    mockTransformConfigs.mockResolvedValue([{ request: { type: randomString() }, response: {} } as Resource])
    const validationError = randomString('oops')
    mockValidateBodies.mockResolvedValue(validationError)

    await expect(tryLoadConfig()).rejects.toThrowError(InvalidBodyTypeError)
  })

  it('throws when there is a problem trying to validate a body against a type', async () => {
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
    })
    mockTransformConfigs.mockResolvedValue([
      { request: {}, response: { type: randomString('some type') } } as Resource,
    ])
    mockValidateBodies.mockRejectedValue(new Error(randomString('some error message')))

    await expect(tryLoadConfig()).rejects.toThrowError(BodyValidationError)
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

      const result = await tryLoadConfig()

      expect(result).toStrictEqual<LoadConfigResponse>({
        absoluteFixturePaths: [fixturePath1, expectedAbsPath, fixturePath3],
        configs: [transformedResourceDummy],
      })
    })
  })
})
