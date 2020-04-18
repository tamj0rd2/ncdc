import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http'
import Joi from '@hapi/joi'
import dot from 'dot-object'

export const supportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
type SupportedMethod = typeof supportedMethods[number]

interface ValidatedServeConfig {
  name: string
  serveOnly: boolean // value should default to true if it does not exist
  request: {
    method: SupportedMethod
    type?: string
    headers?: IncomingHttpHeaders
    endpoints?: string | string[]
    serveEndpoint?: string
  } & ({ body?: Data } | { bodyPath?: string })
  response: {
    code: number
    type?: string
    headers?: OutgoingHttpHeaders

    // only 1 of these can be defined
    body?: Data
    bodyPath?: string
    serveBody?: Data
    serveBodyPath?: string
  }
}

const formatMessage = (config: object, { details }: Joi.ValidationError): string[] => {
  const messages = details
    .map((p) => {
      const defaultConigname = 'config'
      const configName = dot.pick(`${p.path[0]}.name`, config)
      const fullPath =
        p.path.length &&
        p.path.reduce<string>(
          (accum, next, i) => {
            if (i === 0 && typeof next === 'number' && !!configName) return accum
            return typeof next === 'number' ? `${accum}[${next}]` : `${accum}.${next}`
          },
          configName ? `'${configName}'` : defaultConigname,
        )
      return { ...p, fullPath }
    })
    .sort((a, b) => {
      if (a.fullPath < b.fullPath) return -1
      if (a.fullPath > b.fullPath) return 1
      return 0
    })
    .map(({ message, fullPath }) => {
      const pathPrefix = fullPath ? `${fullPath} ` : ''
      return `${pathPrefix}${message.replace(/(".*" )/, '')}`
    })

  return messages
}

export interface ValidationSuccess {
  success: true
  validatedConfig: ValidatedServeConfig[]
}

export interface ValidationFailure {
  success: false
  errors: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validate = (config: any): ValidationSuccess | ValidationFailure => {
  const endpointSchema = Joi.string()
    .uri({ relativeOnly: true })
    .ruleset.pattern(/^\//)
    .message('must start with /')

  const endpointsSchema = Joi.alternatives().conditional('.', {
    is: Joi.string().allow(''),
    then: endpointSchema,
    otherwise: Joi.array().items(endpointSchema).min(1), // only required when serveOnly is true
  })

  const bodySchema = [Joi.string(), Joi.object()]

  const schema = Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        serveOnly: Joi.bool().empty().default(false),
        request: Joi.object({
          method: Joi.string()
            .valid(...supportedMethods)
            .uppercase()
            .required(),
          type: Joi.string(),
          headers: Joi.object(),
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
          .when('serveOnly', {
            is: Joi.valid(true),
            then: Joi.object().or('endpoints', 'serveEndpoint'),
          })
          .oxor('body', 'bodyPath'),
        response: Joi.object({
          code: Joi.number().required(),
          type: Joi.string(),
          headers: Joi.object(),
          body: bodySchema,
          serveBody: bodySchema,
        })
          .required()
          .oxor('body', 'bodyPath', 'serveBody', 'serveBodyPath'),
      }),
    )
    .required()
    .ruleset.min(1)
    .message('Your config file must contain at least 1 config item')

  const validationResult = schema.validate(config, {
    abortEarly: false,
  })

  if (!validationResult.error) {
    return { success: true, validatedConfig: validationResult.value }
  }

  return { success: false, errors: formatMessage(config, validationResult.error) }
}
