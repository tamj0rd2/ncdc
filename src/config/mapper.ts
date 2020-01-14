import { Config } from './config'
import Problem from '~problem'
import { mapRequestConfig } from './request'
import { mapResponseConfig } from './response'
import { ConfigSchema } from './schema'
import { TypeValidator } from '~validation'
import { GetBodyToUse } from './body'

// TODO: not sure how to get the type for config schema working. It is not possible to be undefined
export const mapConfig = (
  { name, request, response }: ConfigSchema,
  typeValidator: TypeValidator,
  getBody: GetBodyToUse,
): Promise<Config[] | ReadonlyArray<Problem>> => {
  const requestResult = await mapRequestConfig(request, typeValidator, getBody)
  const responseResult = await mapResponseConfig(response, typeValidator, getBody)

  if (isProblemArray(requestResult) || isProblemArray(responseResult)) {
    const problems: Problem[] = []
    if (isProblemArray(requestResult)) problems.push(...requestResult)
    if (isProblemArray(responseResult)) problems.push(...responseResult)
    return problems
  }

  return requestResult.map<Config>((requestConfig, i) => ({
    name: requestResult.length === 1 ? name : `${name} [${i}]`,
    request: requestConfig,
    response: responseResult,
  }))
}
