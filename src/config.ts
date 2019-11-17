type Endpoint = string

interface RequestConfig {
  endpoint: Endpoint
  method: 'GET'
}

interface ResponseConfig {
  code?: number
  body?: string
  // headers: { [index: string]: string }
  type?: string
}

// export interface Test {
//   request: Endpoint | RequestConfig
//   response: ResponseConfig
// }

export interface TestConfig {
  name: string
  request: RequestConfig | string
  response: ResponseConfig
}

export interface NConfig {
  baseUrl: string
  tests: TestConfig[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRequestConfig(x: any): x is RequestConfig {
  return 'endpoint' in x
}
