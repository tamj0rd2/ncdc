import * as yup from 'yup'
import './methods'
import { TypeValidator, TypeValidationError } from '~validation'
import { ProblemType } from '~problem'
import { IncomingHttpHeaders } from 'http'
import { GetBodyToUse } from './body'
import {
  SupportedMethod,
  testRequestSchema,
  TestRequestSchema,
  baseRequestConfigSchema,
} from './request/schema'

export { SupportedMethod, testRequestSchema }

export interface RequestConfig {
  method: SupportedMethod
  endpoint: string
  body?: Data
  type?: string
  headers?: IncomingHttpHeaders
}

export type RequestConfigArray = PopulatedArray<RequestConfig>

const endpointSchema = yup.string().startsWith('/')

const endpointsSchema = yup
  .array()
  .of(endpointSchema)
  .transform((_, oValue) => (Array.isArray(oValue) ? oValue : [oValue]))

export const serveRequestSchema = baseRequestConfigSchema
  .shape({
    endpoints: endpointsSchema.requiredIfNoSiblings('serveEndpoint'),
    serveEndpoint: endpointSchema.requiredIfNoSiblings('endpoints'),
    serveBody: yup.mixed<Data>().notAllowedIfSiblings('body', 'bodyPath', 'serveBodyPath'),
    serveBodyPath: yup.string().notAllowedIfSiblings('body', 'bodyPath', 'serveBody'),
  })
  .allowedKeysOnly()
type ServeRequestSchema = yup.InferType<typeof serveRequestSchema>

export type RequestSchema = TestRequestSchema | ServeRequestSchema

const chooseEndpoints = ({
  endpoints,
  serveEndpoint,
}: Pick<ServeRequestSchema, 'endpoints' | 'serveEndpoint'>): PopulatedArray<string> =>
  serveEndpoint ? [serveEndpoint] : (endpoints as PopulatedArray<string>)

export const mapRequestConfig = async (
  validatedConfig: RequestSchema,
  typeValidator: TypeValidator,
  getRequestBody: GetBodyToUse,
): Promise<RequestConfigArray> => {
  const { type, method, headers } = validatedConfig

  const bodyToUse: Optional<Data> = await getRequestBody(validatedConfig)

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
