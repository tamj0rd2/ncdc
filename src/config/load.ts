import { readYamlAsync, getFixturePath } from '~io'
import { TypeValidator } from '~validation'
import { validateRawConfig, ValidatedRawConfig } from './validate'
import { Resource } from '~config'
import { NoServiceResourcesError, BodyValidationError, InvalidBodyTypeError } from './errors'
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

  public async load(configPath: string): Promise<LoadConfigResponse> {
    const rawConfigFile = await readYamlAsync(configPath)
    const validatedConfigs = validateRawConfig<T>(rawConfigFile, configPath)

    if (!validatedConfigs.length) {
      throw new NoServiceResourcesError(configPath)
    }

    const transformedConfigs = await this.transformConfigs(validatedConfigs, configPath)

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
      fixturePaths: validatedConfigs
        .flatMap((c) => [c.request.bodyPath, c.response.bodyPath, c.response.serveBodyPath])
        .filter((x): x is string => !!x)
        .map((fixturePath) => getFixturePath(configPath, fixturePath)),
    }
  }
}
