import { readYamlAsync, getFixturePath } from '~io'
import { TypeValidator } from '~validation'
import { validateRawConfig, ValidatedRawConfig } from './validate'
import { Resource } from '~config'
import {
  ServiceConfigReadError,
  ServiceConfigInvalidError,
  NoServiceResourcesError,
  BodyValidationError,
  InvalidBodyTypeError,
} from './errors'
import { validateConfigBodies } from './validate-config-bodies'

export type LoadConfigResponse = {
  configs: Resource[]
  fixturePaths: string[]
}

export type TransformResources<T extends ValidatedRawConfig = ValidatedRawConfig> = (
  resources: T[],
  absoluteConfigPath: string,
) => Promise<Resource[]>
export type GetTypeValidator = () => Promise<TypeValidator>

export default class ConfigLoader<T extends ValidatedRawConfig> {
  constructor(
    private readonly getTypeValidator: GetTypeValidator,
    private readonly transformConfigs: TransformResources<T>,
    private readonly forceRequestValidation: boolean,
  ) {}

  public load = async (configPath: string): Promise<LoadConfigResponse> => {
    let rawConfigFile: unknown

    try {
      rawConfigFile = await readYamlAsync(configPath)
    } catch (err) {
      throw new ServiceConfigReadError(configPath, err.message)
    }

    const validationResult = validateRawConfig<T>(rawConfigFile)
    if (!validationResult.success) {
      throw new ServiceConfigInvalidError(configPath, validationResult.errors)
    }

    if (!validationResult.validatedConfigs.length) {
      throw new NoServiceResourcesError(configPath)
    }

    const transformedConfigs = await this.transformConfigs(validationResult.validatedConfigs, configPath)

    if (!!transformedConfigs.find((c) => c.request.type || c.response.type)) {
      let bodyValidationMessage: string | undefined

      try {
        bodyValidationMessage = await validateConfigBodies(
          transformedConfigs,
          await this.getTypeValidator(),
          this.forceRequestValidation,
        )
      } catch (err) {
        throw new BodyValidationError(configPath, err.message)
      }

      if (bodyValidationMessage) {
        throw new InvalidBodyTypeError(configPath, bodyValidationMessage)
      }
    }

    return {
      configs: transformedConfigs,
      fixturePaths: validationResult.validatedConfigs
        .flatMap((c) => [c.request.bodyPath, c.response.bodyPath, c.response.serveBodyPath])
        .filter((x): x is string => !!x)
        .map((fixturePath) => getFixturePath(configPath, fixturePath)),
    }
  }
}
