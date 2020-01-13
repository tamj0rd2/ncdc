import { object, string, array, bool } from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileAsync } from '~io'
import { mapRequestConfig, RequestConfig, getServeSchema, getTestSchema, TestRequestSchema } from './request'
import { ResponseConfig, mapResponseConfig, testResponseSchema, serveResponseSchema } from './response'
import { TypeValidator } from '~validation'
import { createGetBodyToUse } from './body'
import { Mode } from './types'

export interface Config {
  name: string
  request: RequestConfig
  response: ResponseConfig
}

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
        async ({ name, request, response }): Promise<Config[]> => {
          const requestConfigs = await mapRequestConfig(request, typeValidator, getBody)
          const responseConfig = await mapResponseConfig(response, typeValidator, getBody)

          return requestConfigs.map<Config>((requestConfig, i) => ({
            name: requestConfigs.length === 1 ? name : `${name} [${i}]`,
            request: requestConfig,
            response: responseConfig,
          }))
        },
      ),
  )

  return mappedConfigs.flat()
}
