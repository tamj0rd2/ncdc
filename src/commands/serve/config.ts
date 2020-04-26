import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http'
import Joi from '@hapi/joi'
import dot from 'dot-object'
import { isAbsolute, resolve } from 'path'
import { readJsonAsync } from '~io'
import { blue, bold } from 'chalk'

export const supportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const
export type SupportedMethod = typeof supportedMethods[number]

export interface ValidatedServeConfig {
  name: string
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
  if (!config) {
    return { success: false, errors: ['Your config file cannot be empty'] }
  }

  const endpointSchema = Joi.string()
    .uri({ relativeOnly: true })
    .ruleset.pattern(/^\//)
    .message('must start with /')

  const bodySchema = [Joi.string(), Joi.object()]

  const schema = Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        serveOnly: Joi.bool(),
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

export interface Config {
  name: string
  request: {
    method: SupportedMethod
    endpoint: string
    body?: Data
    type?: string
    headers?: IncomingHttpHeaders
  }
  response: {
    code: number
    body?: Data
    type?: string
    headers?: OutgoingHttpHeaders
  }
}
