import { Resource } from './resource'
import { TypeValidator } from '~validation'
import { bold, red } from 'chalk'
import { TypeValidationMismatchError } from '~validation/errors'

export const validateConfigBodies = async (
  configs: Resource[],
  typeValidator: TypeValidator,
  forceReqValidation: boolean,
): Promise<Optional<string>> => {
  const seenConfigNames = new Set<string>()
  const uniqueConfigs = configs.filter((config) => {
    if (seenConfigNames.has(config.name)) return false
    seenConfigNames.add(config.name)
    return true
  })

  const totalValidationErrors: string[] = []
  for (const config of uniqueConfigs) {
    const validationErrors: string[] = []

    const formatError = (target: 'request' | 'response', err: TypeValidationMismatchError): string => {
      const prefix = red(`Config ${bold(config.name)} ${target} body failed type validation:`)
      return `${prefix}\n${err.message}`
    }

    if (config.request.type && (config.request.body || forceReqValidation)) {
      try {
        await typeValidator.assert(config.request.body?.get(), config.request.type)
      } catch (err) {
        if (err instanceof TypeValidationMismatchError) {
          validationErrors.push(formatError('request', err))
        } else {
          throw err
        }
      }
    }

    if (config.response.type && config.response.body) {
      try {
        await typeValidator.assert(config.response.body?.get(), config.response.type)
      } catch (err) {
        if (err instanceof TypeValidationMismatchError) {
          validationErrors.push(formatError('response', err))
        } else {
          throw err
        }
      }
    }

    if (validationErrors.length) totalValidationErrors.push(validationErrors.join('\n'))
  }

  if (totalValidationErrors.length) return totalValidationErrors.join('\n\n')
}
