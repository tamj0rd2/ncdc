import { IncomingHttpHeaders, OutgoingHttpHeaders, request } from 'http'
import Joi from '@hapi/joi'
import dot from 'dot-object'
import { Config } from '~config'
import { isAbsolute, resolve } from 'path'
import { readJsonAsync } from '~io'

export const supportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const
type SupportedMethod = typeof supportedMethods[number]

export interface ValidatedServeConfig {
  name: string
  // TODO: technically we don't care about this at all if we've run ncdc serve
  serveOnly: boolean // value should default to true if it does not exist
  request: {
    method: SupportedMethod
    type?: string
    headers?: IncomingHttpHeaders
    endpoints?: string[]
    serveEndpoint?: string
    body?: Data
    bodyPath?: string
  }
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

export interface ValidationSuccess {
  success: true
  validatedConfigs: ValidatedServeConfig[]
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
          bodyPath: Joi.string(),
          serveBody: bodySchema,
          serveBodyPath: Joi.string(),
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
    return { success: true, validatedConfigs: validationResult.value }
  }

  const formattedErrors = validationResult.error.details
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

  return { success: false, errors: formattedErrors }
}

export const transformConfigs = async (
  configs: ValidatedServeConfig[],
  absoluteConfigPath: string,
): Promise<Config[]> => {
  const loadBody = async (bodyPath: string): Promise<Data | undefined> => {
    const absolutePathToFile = isAbsolute(bodyPath) ? bodyPath : resolve(absoluteConfigPath, '..', bodyPath)
    return await readJsonAsync(absolutePathToFile)
  }

  const mapConfig = async (c: ValidatedServeConfig, endpoint: string): Promise<Config> => {
    let responseBody: Data | undefined

    if (c.response.serveBodyPath) {
      responseBody = await loadBody(c.response.serveBodyPath)
    } else if (c.response.bodyPath) {
      responseBody = await loadBody(c.response.bodyPath)
    } else {
      responseBody = c.response.serveBody || c.response.body
    }

    return {
      name: c.name,
      request: {
        endpoint,
        method: c.request.method,
        body: c.request.bodyPath ? await loadBody(c.request.bodyPath) : c.request.body,
        headers: c.request.headers,
        type: c.request.type,
      },
      response: {
        code: c.response.code,
        body: responseBody,
        headers: c.response.headers,
        type: c.response.type,
      },
    }
  }

  return Promise.all(
    configs.flatMap<Promise<Config>>((c) => {
      const configTasks: Promise<Config>[] = []

      if (c.request.endpoints) {
        configTasks.push(
          ...c.request.endpoints.map<Promise<Config>>((endpoint) => mapConfig(c, endpoint)),
        )
      }

      if (c.request.serveEndpoint) configTasks.push(mapConfig(c, c.request.serveEndpoint))

      return configTasks
    }),
  )
}
