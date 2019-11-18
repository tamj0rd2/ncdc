import * as yup from 'yup'
import { tryParseJson } from './io'

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

const overallSchema = yup
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

export const createTestConfig = (configPath: string): TestConfig[] => {
  const configItems = tryParseJson<TestConfig[]>(configPath)
  overallSchema.validateSync(configItems, { strict: true })
  return configItems
}

export const createMockConfig = (configPath: string): MockConfig[] => {
  const configItems = tryParseJson<MockConfig[]>(configPath)
  overallSchema.validateSync(configItems, { strict: true })
  return configItems.filter(x => x.response.body ?? x.response.mockBody)
}
