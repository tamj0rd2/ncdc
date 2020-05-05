import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http'

export interface Config {
  name: string
  request: {
    method: SupportedMethod
    endpoint: string
    body?: Data
    type?: string
    headers?: IncomingHttpHeaders
  }
  response: {
    code: number
    body?: Data
    type?: string
    headers?: OutgoingHttpHeaders
  }
}

export const supportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const
export type SupportedMethod = typeof supportedMethods[number]
