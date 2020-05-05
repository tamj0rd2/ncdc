import { Config } from './config'
import Problem from '~problem'
import { mapRequestConfig } from './request'
import { mapResponseConfig } from './response'
import { ConfigSchema } from './schema'
import { TypeValidator } from '~validation'
import { GetBodyToUse } from './body'

const isProblemArray = (x: any): x is ReadonlyArray<Problem> => !!(x[0] as Optional<Problem>)?.path

export interface ProblemResult {
  name: string
  problems: ReadonlyArray<Problem>
}

export const isProblemResult = (x: any): x is ProblemResult =>
  typeof x === 'object' && (x as ProblemResult).problems !== undefined

export const containsProblemResult = (x: any): x is ReadonlyArray<ProblemResult> =>
  Array.isArray(x) && !!x.find(isProblemResult)

export const mapConfig = (typeValidator: TypeValidator, getBody: GetBodyToUse) => async ({
  name,
  request,
  response,
}: ConfigSchema): Promise<Config[] | ProblemResult> => {
  const requestResult = await mapRequestConfig(request, typeValidator, getBody)
  const responseResult = await mapResponseConfig(response, typeValidator, getBody)

  if (isProblemArray(requestResult) || isProblemArray(responseResult)) {
    const problems: Problem[] = []
    if (isProblemArray(requestResult)) problems.push(...requestResult)
    if (isProblemArray(responseResult)) problems.push(...responseResult)
    return { name, problems }
  }

  return requestResult.map<Config>((requestConfig, i) => ({
    name: requestResult.length === 1 ? name : `${name} [${i}]`,
    request: requestConfig,
    response: responseResult,
  }))
}
