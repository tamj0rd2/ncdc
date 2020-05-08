import { isAbsolute, resolve } from 'path'
import { readJsonAsync } from '~io'
import { SupportedMethod } from '~config/types'

export interface ValidatedServeConfig {
  name: string
  serveOnly: boolean
  request: {
    method: SupportedMethod
    type?: string
    headers?: StringDict
    endpoints?: string[]
    serveEndpoint?: string
    body?: Data
    bodyPath?: string
  }
  response: {
    code: number
    type?: string
    headers?: StringDict
    body?: Data
    bodyPath?: string
    serveBody?: Data
    serveBodyPath?: string
  }
}

export const transformConfigs = async (
  configs: ValidatedServeConfig[],
  absoluteConfigPath: string,
): Promise<ServeConfig[]> => {
  const loadBody = async (bodyPath: string): Promise<Data | undefined> => {
    const absolutePathToFile = isAbsolute(bodyPath) ? bodyPath : resolve(absoluteConfigPath, '..', bodyPath)
    return await readJsonAsync(absolutePathToFile)
  }

  const mapConfig = async (c: ValidatedServeConfig, endpoint: string): Promise<ServeConfig> => {
    let responseBody: Data | undefined

    if (c.response.serveBodyPath) {
      responseBody = await loadBody(c.response.serveBodyPath)
    } else if (c.response.bodyPath) {
      responseBody = await loadBody(c.response.bodyPath)
    } else {
      responseBody = c.response.serveBody || c.response.body
    }

    return {
      name: c.name,
      request: {
        endpoint,
        method: c.request.method,
        body: c.request.bodyPath ? await loadBody(c.request.bodyPath) : c.request.body,
        headers: c.request.headers,
        type: c.request.type,
      },
      response: {
        code: c.response.code,
        body: responseBody,
        headers: c.response.headers,
        type: c.response.type,
      },
    }
  }

  return Promise.all(
    configs.flatMap<Promise<ServeConfig>>((c) => {
      const configTasks: Promise<ServeConfig>[] = []

      if (c.request.endpoints) {
        configTasks.push(
          ...c.request.endpoints.map<Promise<ServeConfig>>((endpoint) => mapConfig(c, endpoint)),
        )
      }

      if (c.request.serveEndpoint) configTasks.push(mapConfig(c, c.request.serveEndpoint))

      return configTasks
    }),
  )
}

export interface ServeConfig {
  name: string
  request: {
    method: SupportedMethod
    endpoint: string
    body?: Data
    type?: string
    headers?: StringDict
  }
  response: {
    code: number
    body?: Data
    type?: string
    headers?: StringDict
  }
}
