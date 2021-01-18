import { readFixture } from '~io'
import { Method, Resource } from '~config'
import { Request, Response } from '~config'

export interface ValidatedServeConfig {
  name: string
  serveOnly: boolean
  request: {
    method: Method
    type?: string
    headers?: Record<string, string>
    endpoints?: string[]
    serveEndpoint?: string
    body?: Data
    bodyPath?: string
  }
  response: {
    code: number
    type?: string
    headers?: Record<string, string>
    body?: Data
    bodyPath?: string
    serveBody?: Data
    serveBodyPath?: string
  }
}

export const transformResources = async (
  configs: ValidatedServeConfig[],
  configPath: string,
): Promise<Resource[]> => {
  const mapConfig = async (c: ValidatedServeConfig, endpoint: string): Promise<Resource> => {
    let responseBody: Data | undefined

    if (c.response.serveBodyPath) {
      responseBody = await readFixture(configPath, c.response.serveBodyPath)
    } else if (c.response.bodyPath) {
      responseBody = await readFixture(configPath, c.response.bodyPath)
    } else {
      responseBody = c.response.serveBody || c.response.body
    }

    return {
      name: c.name,
      request: new Request({
        endpoint: endpoint,
        method: c.request.method,
        body: c.request.bodyPath ? await readFixture(configPath, c.request.bodyPath) : c.request.body,
        headers: c.request.headers,
        type: c.request.type,
      }),
      response: new Response({
        code: c.response.code,
        body: responseBody,
        headers: c.response.headers,
        type: c.response.type,
      }),
    }
  }

  return Promise.all(
    configs.flatMap<Promise<Resource>>((c) => {
      const configTasks: Promise<Resource>[] = []

      if (c.request.endpoints) {
        configTasks.push(
          ...c.request.endpoints.map<Promise<Resource>>((endpoint) => mapConfig(c, endpoint)),
        )
      }

      if (c.request.serveEndpoint) configTasks.push(mapConfig(c, c.request.serveEndpoint))

      return configTasks
    }),
  )
}
