import * as yup from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileSync } from 'fs'
import chalk from 'chalk'
import { SupportedMethod, Data } from './types'
import { OutgoingHttpHeaders } from 'http'

export interface RequestConfig {
  endpoint: string
  method: SupportedMethod
  // TODO: add type checking for request body
  body?: Data
  params?: (string | string[])[]
}

export interface MockRequestConfig extends RequestConfig {
  mockEndpoint?: string
}

const stringOrObject = yup.lazy(val => (typeof val === 'string' ? yup.string() : yup.object()))

const requestSchema = yup
  .object({
    endpoint: yup.string(),
    params: yup
      .array()
      .of(yup.lazy(val => (typeof val === 'string' ? yup.string() : yup.array().of(yup.string())))),
    body: stringOrObject,
    method: yup
      .string()
      .required()
      .oneOf(['GET', 'POST']),
    mockEndpoint: yup.string(),
  })
  .noUnknown(true)
  .required()

export interface ResponseConfig {
  code?: number
  body?: Data
  type?: string
  headers?: OutgoingHttpHeaders
}

export interface MockResponseConfig extends ResponseConfig {
  mockBody?: Data
  mockPath?: string
}

const responseSchema = yup
  .object({
    code: yup.number(),
    body: stringOrObject,
    type: yup.string(),
    headers: yup.object(),
    mockBody: stringOrObject,
    mockPath: yup.string(),
  })
  .noUnknown(true)
  .required()

export interface TestConfig {
  name: string
  request: RequestConfig
  response: ResponseConfig
}

export interface MockConfig extends TestConfig {
  request: MockRequestConfig
  response: MockResponseConfig
}

export default function readConfig<T extends TestConfig>(configPath: string): T[] {
  const configItems: T[] = safeLoad(readFileSync(configPath, 'utf8'))

  try {
    yup
      .array()
      .of(
        yup
          .object({
            name: yup.string().required(),
            request: requestSchema,
            response: responseSchema,
          })
          .noUnknown(true),
      )
      .required()
      .validateSync(configItems, { strict: true })
    return configItems
  } catch (err) {
    throw new Error(`${chalk.bold('Config error:')} ${err.message}`)
  }
}
