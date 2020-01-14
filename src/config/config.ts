import { object, string, array, bool } from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileAsync } from '~io'
import { mapRequestConfig, RequestConfig, getServeSchema, getTestSchema, TestRequestSchema } from './request'
import { ResponseConfig, mapResponseConfig, testResponseSchema, serveResponseSchema } from './response'
import { TypeValidator } from '~validation'
import { createGetBodyToUse } from './body'
import { Mode } from './types'
import Problem from '~problem'

export interface Config {
  name: string
  request: RequestConfig
  response: ResponseConfig
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isProblemArray = (x: any): x is ReadonlyArray<Problem> => !!(x[0] as Optional<Problem>)?.path

export default async function readConfig(
  configPath: string,
  typeValidator: TypeValidator,
  mode: Mode.Test | Mode.Serve,
): Promise<Config[]> {
  const rawConfigs = safeLoad(await readFileAsync(configPath))
  if (!Array.isArray(rawConfigs)) throw new Error('Config file should contain an array of configurations')

  const serveSchema = getServeSchema()
  const configs = await array()
    .of(
      object({
        name: string().required(),
        serveOnly: bool().default(false),
        request: object<TestRequestSchema>()
          .when('serveOnly', {
            is: false,
            then: mode === Mode.Test ? getTestSchema().required() : serveSchema.required(),
            otherwise: mode === Mode.Test ? getTestSchema(true).required() : serveSchema.required(),
          })
          .required(),
        response: (mode === Mode.Test ? testResponseSchema : serveResponseSchema).required(),
      }),
    )
    .validate(rawConfigs)

  const getBody = createGetBodyToUse(configPath)

  const mappedConfigs = await Promise.all(
    configs
      .filter(x => mode === Mode.Serve || !x.serveOnly)
      .map(
        async ({ name, request, response }): Promise<Config[] | ReadonlyArray<Problem>> => {
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
        },
      ),
  )

  return mappedConfigs.flat()
}
