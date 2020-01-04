import { Data } from '../types'
import * as yup from 'yup'
import './methods'
import { readJsonAsync } from '../io'

export type SupportedMethod = 'GET' | 'POST'

export interface RequestConfig {
  method: SupportedMethod
  endpoint: string
  body?: Data
  type?: string
}

type RequestConfigArray = PopulatedArray<RequestConfig>

const endpointSchema = yup.string().startsWith('/')
const endpointsSchema = yup.array().of(endpointSchema)

const baseRequestConfigSchema = yup.object({
  method: yup
    .mixed<SupportedMethod>()
    .oneOf(['GET', 'POST'])
    .required(),
  type: yup.string().notRequired(),
  body: yup.mixed<Data>().notAllowedIfSiblings('bodyPath'),
  bodyPath: yup.string().notAllowedIfSiblings('body'),
})

const testRequestSchema = baseRequestConfigSchema
  .shape({ endpoints: endpointsSchema.required() })
  .allowedKeysOnly('serveEndpoint', 'serveBody', 'serveBodyPath')

const serveRequestSchema = baseRequestConfigSchema
  .shape({
    endpoints: endpointsSchema.requiredIfNoSiblings('serveEndpoint'),
    serveEndpoint: endpointSchema.requiredIfNoSiblings('endpoints'),
    serveBody: yup.mixed<Data>().notAllowedIfSiblings('body', 'bodyPath', 'serveBodyPath'),
    serveBodyPath: yup.string().notAllowedIfSiblings('body', 'bodyPath', 'serveBody'),
  })
  .allowedKeysOnly()

export const mapTestRequestConfig = async (requestConfig: object): Promise<RequestConfigArray> => {
  // TODO: type validation of the type against the body could even be done here :O
  const validatedConfig = await testRequestSchema.validate(requestConfig)
  const { bodyPath, body, endpoints, type, method } = validatedConfig

  const bodyToUse: Optional<Data> = bodyPath ? await readJsonAsync(bodyPath) : body

  return endpoints.map(endpoint => ({
    body: bodyToUse,
    endpoint,
    method,
    type,
  })) as RequestConfigArray
}

export const mapServeRequestConfig = async (requestConfig: object): Promise<RequestConfigArray> => {
  // TODO: type validation of the type against the body could even be done here :O
  const validatedConfig = await serveRequestSchema.validate(requestConfig)
  const { method, type, endpoints, serveEndpoint, body, bodyPath, serveBody, serveBodyPath } = validatedConfig

  let bodyToUse: Optional<Data>

  if (body) bodyToUse = body
  else if (bodyPath) bodyToUse = await readJsonAsync(bodyPath)
  else if (serveBody) bodyToUse = serveBody
  else if (serveBodyPath) bodyToUse = await readJsonAsync(serveBodyPath)

  const endpointsToUse = serveEndpoint ? [serveEndpoint] : (endpoints as PopulatedArray<string>)
  return endpointsToUse.map<RequestConfig>(endpoint => ({
    body: bodyToUse,
    endpoint,
    method,
    type,
  })) as RequestConfigArray
}

export interface OldRequestConfig {
  endpoint: string
  method: SupportedMethod
  type?: string
  body?: Data
  params?: (string | string[])[]
}

export interface OldMockRequestConfig extends OldRequestConfig {
  mockEndpoint?: string
}

const stringOrObject = yup.lazy(val => (typeof val === 'string' ? yup.string() : yup.object()))

export const requestSchema = yup
  .object({
    endpoint: yup.string(),
    params: yup
      .array()
      .of(yup.lazy(val => (typeof val === 'string' ? yup.string() : yup.array().of(yup.string())))),
    type: yup.string(),
    body: stringOrObject,
    method: yup
      .string()
      .required()
      .oneOf(['GET', 'POST']),
    mockEndpoint: yup.string(),
  })
  .noUnknown(true)
  .required()
