import { readYamlAsync } from '~io'
import { resolve, isAbsolute } from 'path'
import { TypeValidator } from '~validation'
import { validateConfigBodies, validateRawConfig, ValidatedRawConfig } from './validate'
import { Resource } from '~config'
import {
  ServiceConfigReadError,
  ServiceConfigInvalidError,
  NoServiceResourcesError,
  BodyValidationError,
  InvalidBodyTypeError,
} from './errors'

export type LoadConfigResponse = {
  configs: Resource[]
  absoluteFixturePaths: string[]
}

export type TransformResources<T> = (resources: T[], absoluteConfigPath: string) => Promise<Resource[]>
export type GetTypeValidator = () => Promise<TypeValidator>
export type LoadConfig<T extends ValidatedRawConfig> = (
  configPath: string,
  getTypeValidator: GetTypeValidator,
  transformConfigs: TransformResources<T>,
  isTestMode: boolean,
) => Promise<LoadConfigResponse>

const loadConfig = async <T extends ValidatedRawConfig>(
  configPath: string,
  getTypeValidator: GetTypeValidator,
  transformConfigs: TransformResources<T>,
  isTestMode: boolean,
): Promise<LoadConfigResponse> => {
  const absoluteConfigPath = resolve(configPath)
  let rawConfigFile: unknown

  try {
    rawConfigFile = await readYamlAsync(absoluteConfigPath)
  } catch (err) {
    throw new ServiceConfigReadError(absoluteConfigPath, err.message)
  }

  const validationResult = validateRawConfig<T>(rawConfigFile)
  if (!validationResult.success) {
    throw new ServiceConfigInvalidError(absoluteConfigPath, validationResult.errors)
  }

  if (!validationResult.validatedConfigs.length) {
    throw new NoServiceResourcesError(absoluteConfigPath)
  }

  const transformedConfigs = await transformConfigs(validationResult.validatedConfigs, absoluteConfigPath)

  if (!!transformedConfigs.find((c) => c.request.type || c.response.type)) {
    let bodyValidationMessage: string | undefined

    try {
      bodyValidationMessage = await validateConfigBodies(
        transformedConfigs,
        await getTypeValidator(),
        isTestMode,
      )
    } catch (err) {
      throw new BodyValidationError(absoluteConfigPath, err.message)
    }

    if (bodyValidationMessage) {
      throw new InvalidBodyTypeError(absoluteConfigPath, bodyValidationMessage)
    }
  }

  return {
    configs: transformedConfigs,
    absoluteFixturePaths: validationResult.validatedConfigs
      .flatMap((c) => [c.request.bodyPath, c.response.bodyPath, c.response.serveBodyPath])
      .filter((x): x is string => !!x)
      .map((p) => (isAbsolute(p) ? p : resolve(absoluteConfigPath, '..', p))),
  }
}

export default loadConfig
