import '../methods'
import { TypeValidator, TypeValidationError } from '~validation'
import { ProblemType } from '~problem'
import { IncomingHttpHeaders } from 'http'
import { GetBodyToUse } from '../body'
import { testRequestSchema, TestRequestSchema } from './test-schema'
import { serveRequestSchema, ServeRequestSchema } from './serve-schema'
import { SupportedMethod } from './schema-shared'
import { Mode } from '../types'

export { SupportedMethod, testRequestSchema, serveRequestSchema }

export interface RequestConfig {
  method: SupportedMethod
  endpoint: string
  body?: Data
  type?: string
  headers?: IncomingHttpHeaders
}

export type RequestConfigArray = PopulatedArray<RequestConfig>

export type RequestSchema = TestRequestSchema | ServeRequestSchema

export const getRequestSchema = (mode: Mode, serveOnly: boolean) => {
  if (mode === Mode.Serve) {
    return serveRequestSchema
  }

  if (mode === Mode.Test) {
    return testRequestSchema
  }

  throw new Error(`Mode ${mode} is not supported`)
}

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
