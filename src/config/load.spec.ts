import { randomString, mockFn } from '~test-helpers'
import { readYamlAsync, getFixturePath } from '~io'
import { ResourceBuilder } from './resource'
import { LoadConfigResponse, TransformResources, GetTypeValidator } from './load'
import { validateRawConfig, ValidatedRawConfig } from './validate'
import { BodyValidationError, InvalidBodyTypeError, NoServiceResourcesError } from './errors'
import { ValidatedRawConfigBuilder } from './builders'
import ConfigLoader from './load'
import { validateConfigBodies } from './validate-config-bodies'
import { RawConfigBuilder } from './raw-config-builder'

jest.disableAutomock()
jest.mock('./validate')
jest.mock('./validate-config-bodies')
jest.mock('~io')

describe('ConfigLoader', () => {
  function createTestDeps() {
    const mockReadYamlAsync = mockFn(readYamlAsync)
    const mockValidateRawConfig = mockFn(validateRawConfig)
    const mockValidateBodies = mockFn(validateConfigBodies)
    const mockTransformConfigs = mockFn<TransformResources>()
    const mockGetTypeValidator = mockFn<GetTypeValidator>()
    const mockGetFixturePaths = mockFn(getFixturePath)
    const configPath = randomString('configPath')

    return {
      mockReadYamlAsync,
      mockGetFixturePaths,
      mockValidateRawConfig,
      mockValidateBodies,
      mockTransformConfigs,
      mockGetTypeValidator,
      configPath,
    }
  }

  describe('load', () => {
    afterEach(() => jest.resetAllMocks())

    it('calls readYamlAsync with the correct config path', async () => {
      const {
        configPath,
        mockGetTypeValidator,
        mockReadYamlAsync,
        mockTransformConfigs,
        mockValidateRawConfig,
      } = createTestDeps()
      mockValidateRawConfig.mockReturnValue([ValidatedRawConfigBuilder.default])
      mockTransformConfigs.mockResolvedValue([ResourceBuilder.random()])

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)
      await configLoader.load(configPath)

      expect(mockReadYamlAsync).toBeCalledWith(configPath)
    })

    it('returns a failure response when readYamlAsync fails', async () => {
      const { configPath, mockGetTypeValidator, mockReadYamlAsync, mockTransformConfigs } = createTestDeps()
      const expectedError = new Error('that aint right')
      mockReadYamlAsync.mockRejectedValue(expectedError)

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)

      await expect(configLoader.load(configPath)).rejects.toThrowError(expectedError)
    })

    it('calls validate with the correct args', async () => {
      const {
        configPath,
        mockGetTypeValidator,
        mockReadYamlAsync,
        mockTransformConfigs,
        mockValidateRawConfig,
      } = createTestDeps()
      const rawConfigs = [RawConfigBuilder.random()]
      mockReadYamlAsync.mockResolvedValue(rawConfigs)
      mockValidateRawConfig.mockReturnValue([ValidatedRawConfigBuilder.default])
      mockTransformConfigs.mockResolvedValue([])

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)
      await configLoader.load(configPath)

      expect(mockValidateRawConfig).toBeCalledWith(rawConfigs, configPath)
    })

    it('returns a failure response when config validation fails', async () => {
      const {
        configPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateRawConfig,
      } = createTestDeps()
      const expectedError = new Error(randomString('error'))
      mockValidateRawConfig.mockImplementationOnce(() => {
        throw expectedError
      })

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)

      await expect(configLoader.load(configPath)).rejects.toThrowError(expectedError)
    })

    it('returns a warning response if there are no validated configs returned', async () => {
      const {
        configPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateRawConfig,
      } = createTestDeps()
      mockValidateRawConfig.mockReturnValue([])

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)

      await expect(configLoader.load(configPath)).rejects.toThrowError(NoServiceResourcesError)
    })

    it('does not create a type validator if no configs have associated types', async () => {
      const {
        configPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateRawConfig,
      } = createTestDeps()
      mockValidateRawConfig.mockReturnValue([{ serveOnly: false, request: {}, response: {} }])
      mockTransformConfigs.mockResolvedValue([])

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)
      await configLoader.load(configPath)

      expect(mockGetTypeValidator).not.toBeCalled()
    })

    it('calls the transform func with the correct args', async () => {
      const {
        configPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateRawConfig,
      } = createTestDeps()
      const validatedConfigs = [{ serveOnly: false, request: {}, response: {} }]
      mockValidateRawConfig.mockReturnValue(validatedConfigs)
      mockTransformConfigs.mockResolvedValue([])

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)
      await configLoader.load(configPath)

      expect(mockTransformConfigs).toBeCalledWith(validatedConfigs, configPath)
    })

    it('creates a type validator with the correct args when types are present in any config', async () => {
      const {
        configPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateRawConfig,
      } = createTestDeps()
      mockValidateRawConfig.mockReturnValue([{ serveOnly: false, request: {}, response: {} }])
      mockTransformConfigs.mockResolvedValue([
        new ResourceBuilder().withRequestType(randomString('type')).build(),
      ])

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)
      await configLoader.load(configPath)

      expect(mockGetTypeValidator).toBeCalled()
    })

    it('throws an error if a body does not match the correct type', async () => {
      const {
        configPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateBodies,
        mockValidateRawConfig,
      } = createTestDeps()
      mockValidateRawConfig.mockReturnValue([{ serveOnly: false, request: {}, response: {} }])
      mockTransformConfigs.mockResolvedValue([
        new ResourceBuilder().withRequestType(randomString('type')).build(),
      ])
      const validationError = randomString('oops')
      mockValidateBodies.mockResolvedValue(validationError)

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)

      await expect(configLoader.load(configPath)).rejects.toThrowError(InvalidBodyTypeError)
    })

    it('throws when there is a problem trying to validate a body against a type', async () => {
      const {
        configPath,
        mockGetTypeValidator,
        mockTransformConfigs,
        mockValidateBodies,
        mockValidateRawConfig,
      } = createTestDeps()
      mockValidateRawConfig.mockReturnValue([{ serveOnly: false, request: {}, response: {} }])
      mockTransformConfigs.mockResolvedValue([
        new ResourceBuilder().withResponseType(randomString('type')).build(),
      ])
      mockValidateBodies.mockRejectedValue(new Error(randomString('some error message')))

      const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)

      await expect(configLoader.load(configPath)).rejects.toThrowError(BodyValidationError)
    })

    describe('when everything else goes ok', () => {
      // TODO: this test is a bit insane.
      it('returns a response with configs and fixture paths', async () => {
        const {
          configPath,
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
        mockValidateRawConfig.mockReturnValue(validatedConfigs)
        mockGetFixturePaths
          .mockReturnValueOnce(fixturePath1)
          .mockReturnValueOnce(fixturePath2)
          .mockReturnValueOnce(fixturePath3)
        const expectedResource = ResourceBuilder.Default
        mockTransformConfigs.mockResolvedValue([expectedResource])

        const configLoader = new ConfigLoader(mockGetTypeValidator, mockTransformConfigs, false)
        const result = await configLoader.load(configPath)

        expect(mockGetFixturePaths).toBeCalledWith(configPath, fixturePath1)
        expect(mockGetFixturePaths).toBeCalledWith(configPath, fixturePath2)
        expect(mockGetFixturePaths).toBeCalledWith(configPath, fixturePath3)
        expect(result).toStrictEqual<LoadConfigResponse>({
          fixturePaths: [fixturePath1, fixturePath2, fixturePath3],
          configs: [expectedResource],
        })
      })
    })
  })
})
