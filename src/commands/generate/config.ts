import { readYamlAsync } from '~io'
import { validateRawConfig } from '~config/validate'

export type GenerateConfig = {
  name: string
  request: { type?: string }
  response: { type?: string }
}

export const getConfigTypes = async (configPaths: string[]): Promise<string[]> => {
  const configFiles = await Promise.allSettled(
    configPaths.map(async (path) => {
      const rawConfig = await readYamlAsync(path)
      return validateRawConfig<GenerateConfig>(rawConfig, path)
    }),
  )

  const allConfigsDidLoadSuccessfully = (
    results: typeof configFiles,
  ): results is PromiseFulfilledResult<GenerateConfig[]>[] => !results.some((x) => x.status === 'rejected')

  if (allConfigsDidLoadSuccessfully(configFiles)) {
    return Array.from(
      configFiles.reduce((accum, configFile) => {
        configFile.value.forEach(({ request, response }) => {
          if (request.type) accum.add(request.type)
          if (response.type) accum.add(response.type)
        })
        return accum
      }, new Set<string>()),
    )
  }

  const errorMessages = configFiles.reduce<string[]>((messages, configFile) => {
    return configFile.status === 'rejected' ? [...messages, configFile.reason.message] : messages
  }, [])

  throw new Error(errorMessages.join('\n\n'))
}
