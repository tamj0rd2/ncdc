import { SupportedMethod, CommonConfig } from '~config/types'
import { readFixture } from '~io'

export interface ValidatedTestConfig {
  name: string
  serveOnly: boolean
  request: {
    method: SupportedMethod
    type?: string
    headers?: NcdcHeaders
    endpoints: string[]
    body?: Data
    bodyPath?: string
  }
  response: {
    code: number
    type?: string
    headers?: NcdcHeaders
    body?: Data
    bodyPath?: string
  }
}

export type TestConfig = CommonConfig

// TODO: also needs to be responsible for filtering
export const transformConfigs = async (
  configs: ValidatedTestConfig[],
  configPath: string,
): Promise<TestConfig[]> => {
  return Promise.all(
    configs
      .filter((c) => !c.serveOnly)
      .flatMap<Promise<TestConfig>>((c) => {
        return c.request.endpoints.map<Promise<TestConfig>>(async (endpoint) => ({
          name: c.name,
          request: {
            endpoint,
            method: c.request.method,
            body: c.request.bodyPath ? await readFixture(configPath, c.request.bodyPath) : c.request.body,
            headers: c.request.headers,
            type: c.request.type,
          },
          response: {
            code: c.response.code,
            body: c.response.bodyPath ? await readFixture(configPath, c.response.bodyPath) : c.response.body,
            headers: c.response.headers,
            type: c.response.type,
          },
        }))
      }),
  )
}
