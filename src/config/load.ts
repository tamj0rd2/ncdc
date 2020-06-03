import { readYamlAsync } from '~io'
import { resolve, isAbsolute } from 'path'
import { TypeValidator } from '~validation'
import { validateConfigBodies, validateRawConfig, ValidatedRawConfig } from './validate'
import { CommonConfig } from '~config/types'

export enum LoadConfigStatus {
  Success = 'Success',
  ProblemReadingConfig = 'Problem reading config',
  InvalidConfig = 'Invalid config',
  NoConfigs = 'No configs',
  InvalidBodies = 'Invalid config bodies',
  BodyValidationError = 'Body validation error',
}

export type LoadConfigResponse =
  | {
      type: LoadConfigStatus.Success
      configs: CommonConfig[]
      absoluteFixturePaths: string[]
    }
  | {
      type: LoadConfigStatus.NoConfigs
    }
  | {
      type:
        | LoadConfigStatus.InvalidBodies
        | LoadConfigStatus.InvalidConfig
        | LoadConfigStatus.ProblemReadingConfig
        | LoadConfigStatus.BodyValidationError
      message: string
    }

export type TransformConfigs<T> = (configs: T[], absoluteConfigPath: string) => Promise<CommonConfig[]>
export type GetTypeValidator = () => TypeValidator
export type LoadConfig<T extends ValidatedRawConfig> = (
  configPath: string,
  getTypeValidator: GetTypeValidator,
  transformConfigs: TransformConfigs<T>,
  isTestMode: boolean,
) => Promise<LoadConfigResponse>

const loadConfig = async <T extends ValidatedRawConfig>(
  configPath: string,
  getTypeValidator: GetTypeValidator,
  transformConfigs: TransformConfigs<T>,
  isTestMode: boolean,
): Promise<LoadConfigResponse> => {
  const absoluteConfigPath = resolve(configPath)
  let rawConfigFile: unknown

  try {
    rawConfigFile = await readYamlAsync(absoluteConfigPath)
  } catch (err) {
    return {
      type: LoadConfigStatus.ProblemReadingConfig,
      message: `There was a problem reading your config file:\n\n${err.message}`,
    }
  }

  const validationResult = validateRawConfig<T>(rawConfigFile)
  if (!validationResult.success) {
    return {
      type: LoadConfigStatus.InvalidConfig,
      message: `Your config file is invalid:\n\n${validationResult.errors.join('\n')}`,
    }
  }

  if (!validationResult.validatedConfigs.length) {
    return { type: LoadConfigStatus.NoConfigs }
  }

  const transformedConfigs = await transformConfigs(validationResult.validatedConfigs, absoluteConfigPath)

  if (!!transformedConfigs.find((c) => c.request.type || c.response.type)) {
    let bodyValidationMessage: string | undefined

    try {
      bodyValidationMessage = await validateConfigBodies(transformedConfigs, getTypeValidator(), isTestMode)
    } catch (err) {
      return {
        type: LoadConfigStatus.BodyValidationError,
        message: `An error occurred while validating one of your configured fixtures:\n${err.message}`,
      }
    }

    if (bodyValidationMessage) {
      return {
        type: LoadConfigStatus.InvalidBodies,
        message: `One or more of your configured bodies do not match the correct type:\n\n${bodyValidationMessage}`,
      }
    }
  }

  return {
    type: LoadConfigStatus.Success,
    configs: transformedConfigs,
    absoluteFixturePaths: validationResult.validatedConfigs
      .flatMap((c) => [c.request.bodyPath, c.response.bodyPath, c.response.serveBodyPath])
      .filter((x): x is string => !!x)
      .map((p) => (isAbsolute(p) ? p : resolve(absoluteConfigPath, '..', p))),
  }
}

export default loadConfig
