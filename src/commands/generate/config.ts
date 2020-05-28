import { readYamlAsync } from '~io'
import { validateRawConfig, ValidationSuccess } from '~config/validate'
import { red } from 'chalk'

export type GenerateConfig = {
  name: string
  request: { type?: string }
  response: { type?: string }
}

type SuccessResults = {
  path: string
  validationResult: ValidationSuccess<GenerateConfig>
}[]

export const getConfigTypes = async (configPaths: string[]): Promise<string[]> => {
  const configFiles = await Promise.all(
    configPaths.map(async (path) => {
      const rawConfig = await readYamlAsync(path)
      const validationResult = validateRawConfig<GenerateConfig>(rawConfig)
      return { path, validationResult }
    }),
  )

  const configsAreValid = (c: typeof configFiles): c is SuccessResults =>
    !c.find((x) => x.validationResult.success !== true)
  if (configsAreValid(configFiles)) {
    return Array.from(
      configFiles.reduce((accum, configFile) => {
        configFile.validationResult.validatedConfigs.forEach(({ request, response }) => {
          if (request.type) accum.add(request.type)
          if (response.type) accum.add(response.type)
        })
        return accum
      }, new Set<string>()),
    )
  }

  const errorMessages = configFiles.reduce<string[]>((messages, configFile) => {
    if (configFile.validationResult.success) return messages
    const prefix = red(`Invalid config file - ${configFile.path}`)
    messages.push(`${prefix}\n${configFile.validationResult.errors.join('\n')}`)
    return messages
  }, [])

  throw new Error(errorMessages.join('\n\n'))
}
