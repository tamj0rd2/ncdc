import { TypeValidator } from '~validation'
import Problem, { ProblemType } from '~problem'
import { IncomingHttpHeaders } from 'http'
import { GetBodyToUse } from '../body'
import { TestRequestSchema } from './test-schema'
import { ServeRequestSchema } from './serve-schema'
import { SupportedMethod } from './schema-shared'

export { SupportedMethod }

export type RequestSchema = TestRequestSchema | ServeRequestSchema

const chooseEndpoints = ({
  endpoints,
  serveEndpoint,
}: Pick<ServeRequestSchema, 'endpoints' | 'serveEndpoint'>): PopulatedArray<string> =>
  serveEndpoint ? [serveEndpoint] : (endpoints as PopulatedArray<string>)

export interface RequestConfig {
  method: SupportedMethod
  endpoint: string
  // TODO: in serve move, only check either Type or Body. not both
  body?: Data
  type?: string
  headers?: IncomingHttpHeaders
}

export type RequestConfigArray = PopulatedArray<RequestConfig>

export const mapRequestConfig = async (
  validatedConfig: RequestSchema,
  typeValidator: TypeValidator,
  getRequestBody: GetBodyToUse,
): Promise<RequestConfigArray | ReadonlyArray<Problem>> => {
  const { type, method, headers } = validatedConfig

  const bodyToUse: Optional<Data> = await getRequestBody(validatedConfig)

  if (bodyToUse && type) {
    const problems = await typeValidator.getProblems(bodyToUse, type, ProblemType.Request)
    if (problems) return problems
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
