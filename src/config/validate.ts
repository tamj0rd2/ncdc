import { Config, supportedMethods } from './types'
import { TypeValidator } from '~validation'
import Joi from '@hapi/joi'
import { blue, bold } from 'chalk'
import dot from 'dot-object'

export interface ValidationSuccess<T = ValidatedRawConfig> {
  success: true
  validatedConfigs: T[]
}

export interface ValidationFailure {
  success: false
  errors: string[]
}

export interface ValidatedRawConfig {
  request: {
    type?: string
    endpoints?: string[]
  }
  response: {
    type?: string
  }
}

export const validateRawConfig = <TOut extends ValidatedRawConfig = ValidatedRawConfig>(
  config: unknown,
): ValidationSuccess<TOut> | ValidationFailure => {
  if (!config) {
    return { success: false, errors: ['Your config file cannot be empty'] }
  }

  const endpointSchema = Joi.string()
    .uri({ relativeOnly: true, allowQuerySquareBrackets: true })
    .ruleset.pattern(/^\//)
    .message('must start with /')

  const bodySchema = [Joi.string(), Joi.object()]

  const schema = Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        serveOnly: Joi.bool(),
        // TODO: the request schema needs to be customisable, or have some way to mutate it
        request: Joi.object({
          method: Joi.string()
            .valid(...supportedMethods)
            .uppercase()
            .required(),
          type: Joi.string(),
          headers: Joi.object(),
          endpoints: Joi.alternatives()
            .conditional('.', {
              is: Joi.string().allow(''),
              then: endpointSchema,
              otherwise: Joi.array().items(endpointSchema).min(1),
            })
            .custom((value) => (typeof value === 'string' ? [value] : value)),
          serveEndpoint: endpointSchema,
          body: bodySchema,
          bodyPath: Joi.string(),
        })
          .required()
          .or('endpoints', 'serveEndpoint')
          .oxor('body', 'bodyPath'),
        response: Joi.object({
          code: Joi.number().required(),
          type: Joi.string(),
          headers: Joi.object(),
          body: bodySchema,
          bodyPath: Joi.string(),
          serveBody: bodySchema,
          serveBodyPath: Joi.string(),
        })
          .required()
          .oxor('body', 'bodyPath', 'serveBody', 'serveBodyPath'),
      }),
    )
    .required()
    .ruleset.unique('name')
    .message('must have a unique name')
    .ruleset.min(1)
    .message('Your config file must contain at least 1 config item')

  const validationResult = schema.validate(config, {
    abortEarly: false,
  })

  if (!validationResult.error) {
    return { success: true, validatedConfigs: validationResult.value }
  }

  const formattedErrors = validationResult.error.details
    .map((p) => {
      const configName: string = dot.pick(`${p.path[0]}.name`, config)
      const fullPath =
        p.path.length &&
        p.path.reduce<string>((accum, next, i) => {
          if (i === 0 && typeof next === 'number') return bold(`config[${configName || next}]`)
          return typeof next === 'number' ? `${accum}[${next}]` : `${accum}.${next}`
        }, '')
      return { ...p, fullPath }
    })
    .sort((a, b) => {
      if (a.fullPath < b.fullPath) return -1
      if (a.fullPath > b.fullPath) return 1
      return 0
    })
    .map(({ message, fullPath }) => {
      const pathPrefix = fullPath ? `${fullPath} ` : ''
      return `${blue(pathPrefix)}${message.replace(/(".*" )/, '')}`
    })

  return { success: false, errors: formattedErrors }
}

export const validateConfigBodies = async (
  configs: Config[],
  typeValidator: TypeValidator,
): Promise<Optional<string>> => {
  const seenConfigNames = new Set<string>()
  const uniqueConfigs = configs.filter((config) => {
    if (seenConfigNames.has(config.name)) return false
    seenConfigNames.add(config.name)
    return true
  })

  let totalValidationError = ''
  for (const config of uniqueConfigs) {
    const validationErrors: string[] = []

    if (config.request.body && config.request.type) {
      const result = await typeValidator.validate(config.request.body, config.request.type)
      if (!result.success) {
        const message = `Config '${config.name}' request body failed type validation:\n${result.errors.join(
          '\n',
        )}`
        validationErrors.push(message)
      }
    }
    if (config.response.body && config.response.type) {
      const result = await typeValidator.validate(config.response.body, config.response.type)
      if (!result.success) {
        const message = `Config '${config.name}' response body failed type validation:\n${result.errors.join(
          '\n',
        )}`
        validationErrors.push(message)
      }
    }

    totalValidationError += validationErrors.join('\n')
  }

  return totalValidationError
}
