import { mocked, randomString } from '~test-helpers'
import { readGenerateConfig } from './config'
import { readYamlAsync } from '~io'
import { validateRawConfig } from '~config/validate'
import { ConfigBuilder } from '~config/types'

jest.disableAutomock()
jest.mock('~io')
jest.mock('~config/validate')

describe('readGenerateConfig', () => {
  afterEach(() => jest.resetAllMocks())

  const mockReadYaml = mocked(readYamlAsync)
  const mockValidateConfig = mocked(validateRawConfig)

  it('calls readFileSync with the correct args', async () => {
    const configPath = randomString('resolved path')
    mockValidateConfig.mockReturnValue({ success: true, validatedConfigs: [] })

    await readGenerateConfig(configPath)

    expect(mockReadYaml).toHaveBeenCalledWith(configPath)
  })

  it('calls validate raw config with the correct args', async () => {
    mockReadYaml.mockResolvedValue('hello moto')
    mockValidateConfig.mockReturnValue({ success: true, validatedConfigs: [] })

    await readGenerateConfig('path')

    expect(mockValidateConfig).toHaveBeenCalledWith('hello moto')
  })

  it('returns each validated config', async () => {
    const configs = [new ConfigBuilder().build(), new ConfigBuilder().build()]
    mockValidateConfig.mockReturnValue({ success: true, validatedConfigs: configs })

    const result = await readGenerateConfig('path')

    expect(result).toStrictEqual(configs)
  })

  it('throws an error when the validation fails', async () => {
    const error1 = randomString('error1')
    const error2 = randomString('error2')
    mockValidateConfig.mockReturnValue({ success: false, errors: [error1, error2] })

    await expect(readGenerateConfig('path')).rejects.toThrow(`${error1}\n${error2}`)
  })
})
