import * as yup from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileSync } from 'fs'

interface RequestConfig {
  endpoint: string
  method: 'GET'
}

const requestSchema = yup
  .object({
    endpoint: yup.string().required(),
    mockEndpoint: yup.string(),
    method: yup
      .string()
      .required()
      .oneOf(['GET']),
  })
  .noUnknown(true)
  .required()

const stringOrObject = yup.lazy(val => (typeof val === 'string' ? yup.string() : yup.object()))

interface ResponseConfig {
  code?: number
  body?: string | object
  type?: string
}

const responseSchema = yup
  .object({
    code: yup.number(),
    type: yup.string(),
    body: stringOrObject,
    mockBody: stringOrObject,
  })
  .noUnknown(true)
  .required()

export interface TestConfig {
  name: string
  request: RequestConfig
  response: ResponseConfig
}

export type MockConfig = TestConfig & {
  request: { mockEndpoint?: string }
  response: { body: string | object; mockBody?: string }
}

export function readConfig<T extends TestConfig>(configPath: string): T[] {
  const configItems = safeLoad(readFileSync(configPath, 'utf8'))
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
}
