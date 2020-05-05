import { readYamlAsync } from '~io'
import { resolve } from 'path'
import { TypeValidator } from '~validation'
import { CreateTypeValidator } from '~commands'
import { validateConfigBodies, validateRawConfig, ValidatedRawConfig } from './validate'
import { Config } from '~config/types'

export type LoadConfigResponse = LoadConfigFailure | LoadConfigSuccess | LoadConfigWarning

export type LoadArgs = {
  configPath: string
  tsconfigPath: string
  force: boolean
  schemaPath?: string
}

export type TransformConfigs = <T>(configs: T[], absoluteConfigPath: string) => Promise<Config[]>

const loadConfig = async <TOut extends ValidatedRawConfig>(
  args: LoadArgs,
  createTypeValidator: CreateTypeValidator,
  transformConfigs: TransformConfigs,
): Promise<LoadConfigResponse> => {
  const absoluteConfigPath = resolve(args.configPath)
  let rawConfigFile: unknown

  try {
    rawConfigFile = await readYamlAsync(absoluteConfigPath)
  } catch (err) {
    return {
      type: 'failure',
      message: `Problem reading your config file: ${err.message}`,
    }
  }

  const validationResult = validateRawConfig<TOut>(rawConfigFile)
  if (!validationResult.success) {
    return {
      type: 'failure',
      message: `Your config file is invalid:\n\n${validationResult.errors.join('\n')}`,
    }
  }

  if (!validationResult.validatedConfigs.length) {
    return { type: 'warning', message: 'You have no configs to run against' }
  }

  const configUsesTypes = validationResult.validatedConfigs.find((c) => c.request.type || c.response.type)
  let typeValidator: TypeValidator | undefined

  if (configUsesTypes && (args.schemaPath || !typeValidator)) {
    typeValidator = configUsesTypes && createTypeValidator(args.tsconfigPath, args.force, args.schemaPath)
  }

  const transformedConfigs = await transformConfigs(validationResult.validatedConfigs, absoluteConfigPath)

  if (typeValidator) {
    const bodyValidationMessage = await validateConfigBodies(transformedConfigs, typeValidator)
    if (bodyValidationMessage) {
      return {
        type: 'failure',
        message: `One or more of your configured bodies do not match the correct type\n\n${bodyValidationMessage}`,
      }
    }
  }

  return { type: 'success', configs: transformedConfigs }
}

type LoadConfigFailure = {
  type: 'failure'
  message: string
}

type LoadConfigWarning = {
  type: 'warning'
  message: string
}

type LoadConfigSuccess = {
  type: 'success'
  configs: Config[]
}

export default loadConfig
