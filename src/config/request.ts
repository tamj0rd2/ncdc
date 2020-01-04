import { Data } from '../types'
import * as yup from 'yup'
import './methods'
import { readJsonAsync } from '../io'

export type SupportedMethod = 'GET' | 'POST'
export interface RequestConfig2 {
  method: SupportedMethod
  endpoints: PopulatedArray<string>
  body?: Data
  type?: string
}

const testRequestSchema = yup
  .object()
  .shape({
    method: yup
      .mixed<SupportedMethod>()
      .oneOf(['GET', 'POST'])
      .required(),
    endpoints: yup
      .array()
      .of(yup.string().startsWith('/'))
      .required(),
    type: yup.string().notRequired(),
    body: yup.mixed<Data>().notAllowedIfSiblings('bodyPath'),
    bodyPath: yup.string().notAllowedIfSiblings('body'),
  })
  .allowedKeysOnly('serveEndpoint')

export const mapTestRequestConfig = async (requestConfig: object): Promise<RequestConfig2> => {
  const validatedConfig = await testRequestSchema.validate(requestConfig)

  const body: Optional<Data> = validatedConfig.bodyPath
    ? await readJsonAsync(validatedConfig.bodyPath)
    : validatedConfig.body

  return {
    body,
    endpoints: validatedConfig.endpoints as PopulatedArray<string>,
    method: validatedConfig.method,
    type: validatedConfig.type,
  }
}

const serveRequestSchema = yup
  .object({
    method: yup
      .mixed<SupportedMethod>()
      .oneOf(['GET', 'POST'])
      .required(),
    endpoints: yup
      .array()
      .of(yup.string().startsWith('/'))
      .requiredIfNoSiblings('serveEndpoint'),
    serveEndpoint: yup
      .string()
      .requiredIfNoSiblings('endpoints')
      .startsWith('/'),
    // .startsWith('/'),
    type: yup.string().notRequired(),
    body: yup.mixed<Data>().notAllowedIfSiblings('bodyPath'),
    bodyPath: yup.string().notAllowedIfSiblings('body'),
    // NOTE: serveBody/serveBodyPath should only be used in cases where a body or bodypath isn't specified.
    // This apeases the case where someone might want to do a cdc test where they don't check the boxy
    // while still being able to have a body available in serve mode
    serveBody: yup.mixed<Data>().notAllowedIfSiblings('body', 'bodyPath', 'serveBodyPath'),
    serveBodyPath: yup.string().notAllowedIfSiblings('body', 'bodyPath', 'serveBody'),
  })
  .allowedKeysOnly()

export const mapServeRequestConfig = async (requestConfig: object): Promise<RequestConfig2> => {
  // TODO: type validation of the type against the body could even be done here :O
  const validatedConfig = await serveRequestSchema.validate(requestConfig)
  const { method, type, endpoints, serveEndpoint, body, bodyPath, serveBody, serveBodyPath } = validatedConfig

  let bodyToUse: Optional<Data>

  if (body) bodyToUse = body
  else if (bodyPath) bodyToUse = await readJsonAsync(bodyPath)
  else if (serveBody) bodyToUse = serveBody
  if (serveBodyPath) bodyToUse = await readJsonAsync(serveBodyPath)

  return {
    body: bodyToUse,
    endpoints: serveEndpoint ? [serveEndpoint] : (endpoints as PopulatedArray<string>),
    method: method,
    type: type,
  }
}

export interface RequestConfig {
  endpoint: string
  method: SupportedMethod
  type?: string
  body?: Data
  params?: (string | string[])[]
}

export interface MockRequestConfig extends RequestConfig {
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
