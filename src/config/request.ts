import { Data } from '../types'
import * as yup from 'yup'
import './methods'
import { readJsonAsync } from '../io'
import TypeValidator, { TypeValidationError } from '../validation/type-validator'
import { ProblemType } from '../problem'
import { Mode } from './config'
import { IncomingHttpHeaders } from 'http'

export type SupportedMethod = 'GET' | 'POST'

export interface RequestConfig {
  method: SupportedMethod
  endpoint: string
  body?: Data
  type?: string
  headers?: IncomingHttpHeaders
}

export type RequestConfigArray = PopulatedArray<RequestConfig>

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
  headers: yup
    .object<IncomingHttpHeaders>()
    .ofHeaders()
    .notRequired(),
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
type ServeRequestSchema = yup.InferType<typeof serveRequestSchema>

const getBodyToUse = async (config: Pick<ServeRequestSchema, BodyKeys>): Promise<Optional<Data>> => {
  const { body, bodyPath, serveBody, serveBodyPath } = config

  if (body) return body
  if (bodyPath) return await readJsonAsync(bodyPath)
  if (serveBody) return serveBody
  if (serveBodyPath) return await readJsonAsync(serveBodyPath)
}

const chooseEndpoints = ({
  endpoints,
  serveEndpoint,
}: Pick<ServeRequestSchema, 'endpoints' | 'serveEndpoint'>): PopulatedArray<string> =>
  serveEndpoint ? [serveEndpoint] : (endpoints as PopulatedArray<string>)

export const mapRequestConfig = async (
  requestConfig: object,
  typeValidator: TypeValidator,
  mode: Mode.Test | Mode.Serve,
): Promise<RequestConfigArray> => {
  const schema = mode === Mode.Test ? testRequestSchema : serveRequestSchema
  const validatedConfig = await schema.validate(requestConfig)
  const { type, method, headers } = validatedConfig

  const bodyToUse: Optional<Data> = await getBodyToUse(validatedConfig)

  if (bodyToUse && type) {
    const problems = await typeValidator.getProblems(bodyToUse, type, ProblemType.Request)
    if (problems) throw new TypeValidationError(problems)
  }

  const endpointsToUse: PopulatedArray<string> = chooseEndpoints(validatedConfig)

  return endpointsToUse.map(endpoint => ({
    body: bodyToUse,
    endpoint,
    method,
    type,
    headers,
  })) as RequestConfigArray
}

// =====================
// Old stuff. gross.
// =====================

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
