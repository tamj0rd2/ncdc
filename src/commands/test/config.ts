import { SupportedMethod, Resource } from '~config'
import { readFixture } from '~io'
import { Request, Response } from '~config/resource'

export interface ValidatedTestConfig {
  name: string
  serveOnly: boolean
  request: {
    method: SupportedMethod
    type?: string
    headers?: Record<string, string>
    endpoints: string[]
    body?: Data
    bodyPath?: string
  }
  response: {
    code: number
    type?: string
    headers?: Record<string, string>
    body?: Data
    bodyPath?: string
  }
}

// TODO: also needs to be responsible for filtering
export const transformConfigs = async (
  configs: ValidatedTestConfig[],
  configPath: string,
): Promise<Resource[]> => {
  return Promise.all(
    configs
      .filter((c) => !c.serveOnly)
      .flatMap<Promise<Resource>>((c) => {
        return c.request.endpoints.map<Promise<Resource>>(async (endpoint) => ({
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
            body: c.response.bodyPath ? await readFixture(configPath, c.response.bodyPath) : c.response.body,
            headers: c.response.headers,
            type: c.response.type,
          }),
        }))
      }),
  )
}
