import { SupportedMethod, CommonConfig } from '~config/types'
import { isAbsolute, resolve } from 'path'
import { readJsonAsync } from '~io'

export interface ValidatedTestConfig {
  name: string
  serveOnly: boolean
  request: {
    method: SupportedMethod
    type?: string
    headers?: StringDict
    endpoints: string[]
    body?: Data
    bodyPath?: string
  }
  response: {
    code: number
    type?: string
    headers?: StringDict
    body?: Data
    bodyPath?: string
  }
}

export type TestConfig = CommonConfig

// TODO: also needs to be responsible for filtering
export const transformConfigs = async (
  configs: ValidatedTestConfig[],
  absoluteConfigPath: string,
): Promise<TestConfig[]> => {
  const loadBody = async (bodyPath: string): Promise<Data | undefined> => {
    const absolutePathToFile = isAbsolute(bodyPath) ? bodyPath : resolve(absoluteConfigPath, '..', bodyPath)
    return await readJsonAsync(absolutePathToFile)
  }

  return Promise.all(
    configs
      .filter((c) => !c.serveOnly)
      .flatMap<Promise<TestConfig>>((c) => {
        return c.request.endpoints.map<Promise<TestConfig>>(async (endpoint) => ({
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
            body: c.response.bodyPath ? await loadBody(c.response.bodyPath) : c.response.body,
            headers: c.response.headers,
            type: c.response.type,
          },
        }))
      }),
  )
}
