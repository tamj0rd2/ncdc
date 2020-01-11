import * as yup from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileAsync } from '~io'
import { mapRequestConfig, RequestConfig, testRequestSchema, serveRequestSchema } from './request'
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
  const rawConfig = safeLoad(await readFileAsync(configPath))
  const configs = await yup
    .array()
    .of(
      yup.object({
        name: yup.string().required(),
        request: (mode === Mode.Test ? testRequestSchema : serveRequestSchema).required(),
        response: (mode === Mode.Test ? testResponseSchema : serveResponseSchema).required(),
      }),
    )
    .validate(rawConfig)

  const getBody = createGetBodyToUse(configPath)

  const mappedConfigs = await Promise.all(
    configs
      .filter(x => mode === Mode.Serve || !x.request.serveOnly)
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
