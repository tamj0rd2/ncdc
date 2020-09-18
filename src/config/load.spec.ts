import { mocked, randomString, mockFn } from '~test-helpers'
import { readYamlAsync, getFixturePath } from '~io'
import { ResourceBuilder } from './resource'
import { LoadConfigResponse, TransformResources, GetTypeValidator } from './load'
import { validateRawConfig, ValidatedRawConfig } from './validate'
import {
  BodyValidationError,
  InvalidBodyTypeError,
  NoServiceResourcesError,
  ServiceConfigInvalidError,
  ServiceConfigReadError,
} from './errors'
import { RawConfigBuilder } from './builders'
import ConfigLoader from './load'
import { validateConfigBodies } from './validate-config-bodies'

jest.disableAutomock()
jest.mock('./validate')
jest.mock('./validate-config-bodies')
jest.mock('~io')

describe('ConfigLoader', () => {
  function createTestDeps() {
    const mockReadYamlAsync = mocked(readYamlAsync)
    const mockValidateRawConfig = mocked(validateRawConfig)
    const mockValidateBodies = mocked(validateConfigBodies)
    const mockTransformConfigs = mockFn<TransformResources>()
    const mockGetTypeValidator = mockFn<GetTypeValidator>()
    const mockGetFixturePaths = mocked(getFixturePath)
    const dummyConfigPath = randomString('configPath')

    return {
      mockReadYamlAsync,
      mockGetFixturePaths,
      mockValidateRawConfig,
      mockValidateBodies,
      mockTransformConfigs,
      mockGetTypeValidator,
      dummyConfigPath,
    }
  }

  describe('load', () => {
    afterEach(() => jest.resetAllMocks())

    it('calls readYamlAsync with the correct config path', async () => {
      const {
        dummyConfigPath,
        mockGetTypeValidator,
        mockReadYamlAsync,
        mockTransformConfigs,
        mockValidateRawConfig,
      } = createTestDeps()
      mockValidateRawConfig.mockReturnValue({
        success: true,
        validatedConfigs: [RawConfigBuilder.default],
      })
      mockTransformConfigs.mockResolvedValue([ResourceBuilder.Default])

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)
      await configLoader.load(dummyConfigPath)

      expect(mockReadYamlAsync).toBeCalledWith(dummyConfigPath)
    })

    it('returns a failure response when readYamlAsync fails', async () => {
      const {
        dummyConfigPath,
        mockGetTypeValidator,
        mockReadYamlAsync,
        mockTransformConfigs,
      } = createTestDeps()
      mockReadYamlAsync.mockRejectedValue(new Error('that aint right'))

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)

      await expect(configLoader.load(dummyConfigPath)).rejects.toThrowError(ServiceConfigReadError)
    })

    it('calls validate with the correct args', async () => {
      const {
        dummyConfigPath,
        mockGetTypeValidator,
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

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)
      await configLoader.load(dummyConfigPath)

      expect(mockValidateRawConfig).toBeCalledWith(rawConfigs)
    })

    it('returns a failure response when config validation fails', async () => {
      const {
        dummyConfigPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateRawConfig,
      } = createTestDeps()
      const errors = [randomString(), randomString()]
      mockValidateRawConfig.mockReturnValue({ success: false, errors })

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)

      await expect(configLoader.load(dummyConfigPath)).rejects.toThrowError(ServiceConfigInvalidError)
    })

    it('returns a warning response if there are no validated configs returned', async () => {
      const {
        dummyConfigPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateRawConfig,
      } = createTestDeps()
      mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs: [] })

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)

      await expect(configLoader.load(dummyConfigPath)).rejects.toThrowError(NoServiceResourcesError)
    })

    it('does not create a type validator if no configs have associated types', async () => {
      const {
        dummyConfigPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateRawConfig,
      } = createTestDeps()
      mockValidateRawConfig.mockReturnValue({
        success: true,
        validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
      })
      mockTransformConfigs.mockResolvedValue([])

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)
      await configLoader.load(dummyConfigPath)

      expect(mockGetTypeValidator).not.toBeCalled()
    })

    it('calls the transform func with the correct args', async () => {
      const {
        dummyConfigPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateRawConfig,
      } = createTestDeps()
      const validatedConfigs = [{ serveOnly: false, request: {}, response: {} }]
      mockValidateRawConfig.mockReturnValue({ success: true, validatedConfigs })
      mockTransformConfigs.mockResolvedValue([])

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)
      await configLoader.load(dummyConfigPath)

      expect(mockTransformConfigs).toBeCalledWith(validatedConfigs, dummyConfigPath)
    })

    it('creates a type validator with the correct args when types are present in any config', async () => {
      const {
        dummyConfigPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateRawConfig,
      } = createTestDeps()
      mockValidateRawConfig.mockReturnValue({
        success: true,
        validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
      })
      mockTransformConfigs.mockResolvedValue([
        new ResourceBuilder().withRequestType(randomString('type')).build(),
      ])

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)
      await configLoader.load(dummyConfigPath)

      expect(mockGetTypeValidator).toBeCalled()
    })

    it('throws an error if a body does not match the correct type', async () => {
      const {
        dummyConfigPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateBodies,
        mockValidateRawConfig,
      } = createTestDeps()
      mockValidateRawConfig.mockReturnValue({
        success: true,
        validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
      })
      mockTransformConfigs.mockResolvedValue([
        new ResourceBuilder().withRequestType(randomString('type')).build(),
      ])
      const validationError = randomString('oops')
      mockValidateBodies.mockResolvedValue(validationError)

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)

      await expect(configLoader.load(dummyConfigPath)).rejects.toThrowError(InvalidBodyTypeError)
    })

    it('throws when there is a problem trying to validate a body against a type', async () => {
      const {
        dummyConfigPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateBodies,
        mockValidateRawConfig,
      } = createTestDeps()
      mockValidateRawConfig.mockReturnValue({
        success: true,
        validatedConfigs: [{ serveOnly: false, request: {}, response: {} }],
      })
      mockTransformConfigs.mockResolvedValue([
        new ResourceBuilder().withResponseType(randomString('type')).build(),
      ])
      mockValidateBodies.mockRejectedValue(new Error(randomString('some error message')))

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)

      await expect(configLoader.load(dummyConfigPath)).rejects.toThrowError(BodyValidationError)
    })

    describe('when everything else goes ok', () => {
      // TODO: this test is a bit insane.
      it('returns a response with configs and fixture paths', async () => {
        const {
          dummyConfigPath,
          mockGetTypeValidator,
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

        const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)
        const result = await configLoader.load(dummyConfigPath)

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
})
