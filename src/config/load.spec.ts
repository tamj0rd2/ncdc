import { mocked, randomString, mockObj, mockFn } from '~test-helpers'
import { readYamlAsync } from '~io'
import { resolve } from 'path'
import { Config } from './types'
import loadConfig, { LoadArgs, LoadConfigResponse, TransformConfigs } from './load'
import { TypeValidator } from '~validation'
import { CreateTypeValidator } from '~commands'
import { validateRawConfig } from './validate'

jest.unmock('./load')
jest.mock('path')

const createDefaultArgs = (): LoadArgs => ({
  configPath: randomString('configPath'),
  force: false,
  tsconfigPath: randomString('tsconfigPath'),
  schemaPath: randomString('schemaPath'),
})

describe('loadConfig', () => {
  const mockReadYamlAsync = mocked(readYamlAsync)
  const mockResolve = mocked(resolve)
  const mockValidate = mocked(validateRawConfig)
  const mockTransformConfigs = mockFn<TransformConfigs>()
  const mockTypeValidator = mockObj<TypeValidator>({ validate: jest.fn() })
  const mockCreateTypeValidator = mockFn<CreateTypeValidator>()

  beforeEach(() => {
    jest.resetAllMocks()
    mockValidate.mockReturnValue({ success: true, validatedConfigs: [] })
    mockTransformConfigs.mockResolvedValue([
      { name: randomString('name'), request: {}, response: {} } as Config,
    ])
    mockCreateTypeValidator.mockReturnValue(mockTypeValidator)
  })

  const defaultArgs = createDefaultArgs()
  const act = async (): Promise<LoadConfigResponse> =>
    loadConfig(defaultArgs, mockCreateTypeValidator, mockTransformConfigs)

  it('calls readYamlAsync with the correct config path', async () => {
    const resolvedPath = 'wot m8'
    mockResolve.mockReturnValue(resolvedPath)

    await act()

    expect(mockResolve).toBeCalledWith(defaultArgs.configPath)
    expect(mockReadYamlAsync).toBeCalledWith(resolvedPath)
  })

  it('returns a failure response when readYamlAsync fails', async () => {
    mockReadYamlAsync.mockRejectedValue(new Error('that aint right'))

    const result = await act()

    expect(result).toStrictEqual<LoadConfigResponse>({
      type: 'failure',
      message: 'Problem reading your config file: that aint right',
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
      type: 'failure',
      message: `Your config file is invalid:\n\n${errors[0]}\n${errors[1]}`,
    })
  })

  it('returns a warning response if there are no validated configs returned', async () => {
    mockValidate.mockReturnValue({ success: true, validatedConfigs: [] })

    const result = await act()

    expect(result).toStrictEqual<LoadConfigResponse>({
      type: 'warning',
      message: 'You have no configs to run against',
    })
  })

  // TODO: use a different validate function
  it('does not create a type validator if no configs have associated types', async () => {
    mockValidate.mockReturnValue({ success: true, validatedConfigs: [{ request: {}, response: {} }] })

    await act()

    expect(mockCreateTypeValidator).not.toBeCalled()
  })

  it('creates a type validator with the correct args when types are present in any config', async () => {
    mockValidate.mockReturnValue({
      success: true,
      validatedConfigs: [{ request: { type: randomString('type') }, response: {} }],
    })

    await act()

    expect(mockCreateTypeValidator).toBeCalledWith(
      defaultArgs.tsconfigPath,
      defaultArgs.force,
      defaultArgs.schemaPath,
    )
  })

  it('calls the transform func with the correct args', async () => {
    const validatedConfigs = [{ request: {}, response: {} }]
    mockValidate.mockReturnValue({ success: true, validatedConfigs })
    const absoulteConfigPath = randomString()
    mockResolve.mockReturnValue(absoulteConfigPath)

    await act()

    expect(mockTransformConfigs).toBeCalledWith(validatedConfigs, absoulteConfigPath)
  })
})
