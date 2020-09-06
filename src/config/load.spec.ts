import { mocked, randomString, mockFn } from '~test-helpers'
import { readYamlAsync, getFixturePath } from '~io'
import { Resource, ResourceBuilder } from './resource'
import loadConfig, { LoadConfigResponse, TransformResources, GetTypeValidator } from './load'
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
jest.mock('./validate')
jest.mock('~io')

describe('loadConfig', () => {
  function createTestDeps() {
    const mockReadYamlAsync = mocked(readYamlAsync)
    const mockValidateRawConfig = mocked(validateRawConfig)
    const mockValidateBodies = mocked(validateConfigBodies)
    const mockTransformConfigs = mockFn<TransformResources<unknown>>()
    const mockCreateTypeValidator = mockFn<GetTypeValidator>()
    const mockGetFixturePaths = mocked(getFixturePath)
    const dummyConfigPath = randomString('configPath')

    return {
      mockReadYamlAsync,
      mockGetFixturePaths,
      mockValidateRawConfig,
      mockValidateBodies,
      mockTransformConfigs,
      mockCreateTypeValidator,
      dummyConfigPath,
    }
  }

  afterEach(() => jest.resetAllMocks())

  it('calls readYamlAsync with the correct config path', async () => {
    const {
      dummyConfigPath,
      mockCreateTypeValidator,
      mockReadYamlAsync,
      mockTransformConfigs,
      mockValidateRawConfig,
    } = createTestDeps()
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [RawConfigBuilder.default],
    })
    mockTransformConfigs.mockResolvedValue([ResourceBuilder.Default])

    await loadConfig(dummyConfigPath, mockCreateTypeValidator, mockTransformConfigs, false)

    expect(mockReadYamlAsync).toBeCalledWith(dummyConfigPath)
  })

  it('returns a failure response when readYamlAsync fails', async () => {
    const {
      dummyConfigPath,
      mockCreateTypeValidator,
      mockReadYamlAsync,
      mockTransformConfigs,
    } = createTestDeps()
    mockReadYamlAsync.mockRejectedValue(new Error('that aint right'))

    await expect(
      loadConfig(dummyConfigPath, mockCreateTypeValidator, mockTransformConfigs, false),
    ).rejects.toThrowError(ServiceConfigReadError)
  })

  it('calls validate with the correct args', async () => {
    const {
      dummyConfigPath,
      mockCreateTypeValidator,
      mockReadYamlAsync,
      mockTransformConfigs,
      mockValidateRawConfig,
    } = createTestDeps()
    const rawConfigs: unknown[] = [{ name: 'My Raw Config' }]
    mockReadYamlAsync.mockResolvedValue(rawConfigs)
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [RawConfigBuilder.default],
    })
    mockTransformConfigs.mockResolvedValue([])

    await loadConfig(dummyConfigPath, mockCreateTypeValidator, mockTransformConfigs, false)

    expect(mockValidateRawConfig).toBeCalledWith(rawConfigs)
  })

  it('returns a failure response when config validation fails', async () => {
    const {
      dummyConfigPath,
      mockCreateTypeValidator,
      mockTransformConfigs,
      mockValidateRawConfig,
    } = createTestDeps()
    const errors = [randomString(), randomString()]
    mockValidateRawConfig.mockReturnValue({ success: false, errors })

    await expect(
      loadConfig(dummyConfigPath, mockCreateTypeValidator, mockTransformConfigs, false),
    ).rejects.toThrowError(ServiceConfigInvalidError)
  })

  it('returns a warning response if there are no validated configs returned', async () => {
    const {
      dummyConfigPath,
      mockCreateTypeValidator,
      mockTransformConfigs,
      mockValidateRawConfig,
    } = createTestDeps()
    mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs: [] })

    await expect(
      loadConfig(dummyConfigPath, mockCreateTypeValidator, mockTransformConfigs, false),
    ).rejects.toThrowError(NoServiceResourcesError)
  })

  it('does not create a type validator if no configs have associated types', async () => {
    const {
      dummyConfigPath,
      mockCreateTypeValidator,
      mockTransformConfigs,
      mockValidateRawConfig,
    } = createTestDeps()
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
    })
    mockTransformConfigs.mockResolvedValue([])

    await loadConfig(dummyConfigPath, mockCreateTypeValidator, mockTransformConfigs, false)

    expect(mockCreateTypeValidator).not.toBeCalled()
  })

  it('calls the transform func with the correct args', async () => {
    const {
      dummyConfigPath,
      mockCreateTypeValidator,
      mockTransformConfigs,
      mockValidateRawConfig,
    } = createTestDeps()
    const validatedConfigs = [{ serveOnly: false, request: {}, response: {} }]
    mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs })
    mockTransformConfigs.mockResolvedValue([])

    await loadConfig(dummyConfigPath, mockCreateTypeValidator, mockTransformConfigs, false)

    expect(mockTransformConfigs).toBeCalledWith(validatedConfigs, dummyConfigPath)
  })

  it('creates a type validator with the correct args when types are present in any config', async () => {
    const {
      dummyConfigPath,
      mockCreateTypeValidator,
      mockTransformConfigs,
      mockValidateRawConfig,
    } = createTestDeps()
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
    })
    mockTransformConfigs.mockResolvedValue([{ request: { type: randomString() }, response: {} } as Resource])

    await loadConfig(dummyConfigPath, mockCreateTypeValidator, mockTransformConfigs, false)

    expect(mockCreateTypeValidator).toBeCalled()
  })

  it('throws an error if a body does not match the correct type', async () => {
    const {
      dummyConfigPath,
      mockCreateTypeValidator,
      mockTransformConfigs,
      mockValidateBodies,
      mockValidateRawConfig,
    } = createTestDeps()
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
    })
    mockTransformConfigs.mockResolvedValue([{ request: { type: randomString() }, response: {} } as Resource])
    const validationError = randomString('oops')
    mockValidateBodies.mockResolvedValue(validationError)

    await expect(
      loadConfig(dummyConfigPath, mockCreateTypeValidator, mockTransformConfigs, false),
    ).rejects.toThrowError(InvalidBodyTypeError)
  })

  it('throws when there is a problem trying to validate a body against a type', async () => {
    const {
      dummyConfigPath,
      mockCreateTypeValidator,
      mockTransformConfigs,
      mockValidateBodies,
      mockValidateRawConfig,
    } = createTestDeps()
    mockValidateRawConfig.mockReturnValue({
      success: true,
      validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
    })
    mockTransformConfigs.mockResolvedValue([
      { request: {}, response: { type: randomString('some type') } } as Resource,
    ])
    mockValidateBodies.mockRejectedValue(new Error(randomString('some error message')))

    await expect(
      loadConfig(dummyConfigPath, mockCreateTypeValidator, mockTransformConfigs, false),
    ).rejects.toThrowError(BodyValidationError)
  })

  describe('when everything else goes ok', () => {
    // TODO: this test is a bit insane.
    it('returns a response with configs and fixture paths', async () => {
      const {
        dummyConfigPath,
        mockCreateTypeValidator,
        mockTransformConfigs,
        mockValidateRawConfig,
        mockGetFixturePaths,
      } = createTestDeps()
      const [fixturePath1, fixturePath2, fixturePath3] = [
        randomString('fixture1'),
        randomString('fixture2'),
        randomString('fixture3'),
      ]
      const validatedConfigs: ValidatedRawConfig[] = [
        {
          serveOnly: false,
          request: { bodyPath: fixturePath1 },
          response: { bodyPath: fixturePath2, serveBodyPath: fixturePath3 },
        },
      ]
      mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs })
      mockGetFixturePaths
        .mockReturnValueOnce(fixturePath1)
        .mockReturnValueOnce(fixturePath2)
        .mockReturnValueOnce(fixturePath3)
      const expectedResource = ResourceBuilder.Default
      mockTransformConfigs.mockResolvedValue([expectedResource])

      const result = await loadConfig(dummyConfigPath, mockCreateTypeValidator, mockTransformConfigs, false)

      expect(mockGetFixturePaths).toBeCalledWith(dummyConfigPath, fixturePath1)
      expect(mockGetFixturePaths).toBeCalledWith(dummyConfigPath, fixturePath2)
      expect(mockGetFixturePaths).toBeCalledWith(dummyConfigPath, fixturePath3)
      expect(result).toStrictEqual<LoadConfigResponse>({
        fixturePaths: [fixturePath1, fixturePath2, fixturePath3],
        configs: [expectedResource],
      })
    })
  })
})
