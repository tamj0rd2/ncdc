import * as yup from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileSync } from 'fs'
import chalk from 'chalk'
import { SupportedMethod } from './types'

export interface RequestConfig {
  endpoint: string
  method: SupportedMethod
  params?: (string | string[])[]
}

interface MockRequestConfig extends RequestConfig {
  mockEndpoint?: string
}

const requestSchema = yup
  .object({
    endpoint: yup.string(),
    params: yup
      .array()
      .of(yup.lazy(val => (typeof val === 'string' ? yup.string() : yup.array().of(yup.string())))),
    method: yup
      .string()
      .required()
      .oneOf(['GET']),
    mockEndpoint: yup.string(),
  })
  .noUnknown(true)
  .required()

const stringOrObject = yup.lazy(val => (typeof val === 'string' ? yup.string() : yup.object()))

export interface ResponseConfig {
  code?: number
  body?: string | object | number
  type?: string
}

interface MockResponseConfig extends ResponseConfig {
  body: string | object
  mockBody?: string
  mockPath?: string
}

const responseSchema = yup
  .object({
    code: yup.number(),
    type: yup.string(),
    body: stringOrObject,
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
