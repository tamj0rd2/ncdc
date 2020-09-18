import { SupportedMethod } from './resource'
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
  serveOnly: boolean
  request: {
    type?: string
    endpoints?: string[]
    bodyPath?: string
  }
  response: {
    type?: string
    bodyPath?: string
    serveBodyPath?: string
  }
}

export type MutateRequest = (schema: Joi.ObjectSchema) => Joi.ObjectSchema

export const validateRawConfig = <TOut = ValidatedRawConfig>(
  config: unknown,
): ValidationSuccess<TOut> | ValidationFailure => {
  if (!config) {
    return { success: false, errors: ['Your config file cannot be empty'] }
  }

  const endpointSchema = Joi.string()
    .uri({ relativeOnly: true, allowQuerySquareBrackets: true })
    .ruleset.pattern(/^\//)
    .message('must start with /')

  const endpointsSchema = Joi.alternatives().conditional('.', {
    is: Joi.string().allow(''),
    then: endpointSchema,
    otherwise: Joi.array().items(endpointSchema).min(1),
  })

  const bodySchema = [Joi.string(), Joi.object()]
  const headersSchema = Joi.object().pattern(Joi.string(), Joi.string())

  const schema = Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        serveOnly: Joi.bool().default(false),
        // TODO: the request schema needs to be customisable, or have some way to mutate it
        request: Joi.object({
          method: Joi.string()
            .valid(...Object.values(SupportedMethod))
            .uppercase()
            .required(),
          type: Joi.string(),
          headers: headersSchema,
          endpoints: Joi.alternatives()
            .conditional('...serveOnly', {
              is: Joi.valid(false),
              then: endpointsSchema.required(),
              otherwise: endpointsSchema,
            })
            .custom((value) => (typeof value === 'string' ? [value] : value)),
          serveEndpoint: endpointSchema,
          body: bodySchema,
          bodyPath: Joi.string(),
        })
          .required()
          .oxor('body', 'bodyPath')
          .when('serveOnly', {
            is: Joi.valid(true),
            then: Joi.object().or('endpoints', 'serveEndpoint'),
          }),
        response: Joi.object({
          code: Joi.number().required(),
          type: Joi.string(),
          headers: headersSchema,
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
    .map((error) => {
      const configName: string = dot.pick(`${error.path[0]}.name`, config)
      const fullPath =
        error.path.length &&
        error.path.reduce<string>((accum, next, i) => {
          if (i === 0 && typeof next === 'number') return bold(`config[${configName || next}]`)
          return typeof next === 'number' ? `${accum}[${next}]` : `${accum}.${next}`
        }, '')
      return { ...error, fullPath }
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
