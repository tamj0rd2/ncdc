import { randomString, mockFn, mockObj } from '~test-helpers'
import { getConfigTypes, GenerateConfig } from './config'
import { readYamlAsync } from '~io'
import { validateRawConfig } from '~config/validate'
import { RawConfigBuilder } from '~config/raw-config-builder'
import '../../jest-extensions'

jest.disableAutomock()
jest.mock('~io')
jest.mock('~config/validate')

describe('getConfigTypes', () => {
  function createTestDeps() {
    return {
      getConfigTypes,
      mockReadYamlAsync: mockFn(readYamlAsync),
      mockValidateRawConfig: mockFn(validateRawConfig),
    }
  }

  afterEach(() => jest.resetAllMocks())

  it('calls readYamlAsync with the correct args for each config', async () => {
    const { getConfigTypes, mockReadYamlAsync, mockValidateRawConfig } = createTestDeps()
    mockValidateRawConfig.mockReturnValueTimes([], 2)
    const configPaths = [randomString('path1'), randomString('path2')]

    await getConfigTypes(configPaths)

    expect(mockReadYamlAsync).nthCalledWith(1, configPaths[0])
    expect(mockReadYamlAsync).nthCalledWith(2, configPaths[1])
  })

  describe('config file validation', () => {
    it('validates each config with the correct args', async () => {
      const { getConfigTypes, mockReadYamlAsync, mockValidateRawConfig } = createTestDeps()
      const [configPath1, configPath2] = [randomString('path1'), randomString('path2')]
      const [config1, config2] = [RawConfigBuilder.random(), RawConfigBuilder.random()]
      mockReadYamlAsync.mockResolvedValueOnce(config1).mockResolvedValueOnce(config2)
      mockValidateRawConfig.mockReturnValue([])

      await getConfigTypes([configPath1, configPath2])

      expect(mockValidateRawConfig).nthCalledWith(1, config1, configPath1)
      expect(mockValidateRawConfig).nthCalledWith(2, config2, configPath2)
    })

    it("throws an error containing the details of each config's validation failures", async () => {
      const { getConfigTypes, mockReadYamlAsync, mockValidateRawConfig } = createTestDeps()
      mockReadYamlAsync.mockResolvedValue(RawConfigBuilder.random())

      const [error1, error2] = [randomString('error1'), randomString('error2')]
      mockValidateRawConfig
        .mockImplementationOnce(() => {
          throw new Error(error1)
        })
        .mockReturnValueOnce([])
        .mockImplementationOnce(() => {
          throw new Error(error2)
        })

      const configPaths = ['path1', randomString('path2'), 'path3']
      await expect(getConfigTypes(configPaths)).rejects.toThrowColouredError(`${error1}\n\n${error2}`)
    })
  })

  it('can return a list of types', async () => {
    const { getConfigTypes, mockValidateRawConfig } = createTestDeps()
    const configPaths = [randomString('path1'), randomString('path2')]
    const createConfig = (reqType?: string, resType?: string): GenerateConfig =>
      mockObj<GenerateConfig>({ request: { type: reqType }, response: { type: resType } })

    mockValidateRawConfig
      .mockReturnValueOnce([
        new RawConfigBuilder().withRequestType('RType').build(),
        new RawConfigBuilder().withResponseType('Delta').build(),
      ])
      .mockReturnValueOnce([createConfig(undefined, 'Doom'), createConfig('Machine', 'Guns')])

    const result = await getConfigTypes(configPaths)

    expect(result).toStrictEqual(['RType', 'Delta', 'Doom', 'Machine', 'Guns'])
  })
})
