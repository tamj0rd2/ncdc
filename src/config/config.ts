import * as yup from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileSync } from 'fs'
import chalk from 'chalk'
import { Data } from '../types'
import { OutgoingHttpHeaders } from 'http'

/* TODO: add better output for disallowed keys - https://github.com/jquense/yup/issues/55 https://github.com/jquense/yup/issues/312#issuecomment-442854307
function allowedKeysOnly(this: yup.StringSchema, msg: string) {
  return this.test({
    name: 'allowedKeysOnly',
    message: msg,
    test: () => true,
  })
}

declare module 'yup' {
  interface StringSchema {
    allowedKeysOnly(msg: string): StringSchema
  }
}*/

export type SupportedMethod = 'GET' | 'POST'

export interface RequestConfig {
  endpoint: string
  method: SupportedMethod
  type?: string
  body?: Data
  // TODO: needs testing. Can't even remember how this works
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
    type: yup.string(),
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
  code: number
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
