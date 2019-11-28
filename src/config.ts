import * as yup from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileSync } from 'fs'
import { CustomError } from './errors'
import chalk from 'chalk'

interface RequestConfig {
  endpoint: string
  method: 'GET'
}

const requestSchema = yup
  .object({
    endpoint: yup.string(),
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
    mockPath: yup.string(),
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
  response: {
    body: string | object
    mockBody?: string
    mockPath?: string
  }
}

export function readConfig<T extends TestConfig>(configPath: string, mockMode = false): T[] {
  const loaded: T[] = safeLoad(readFileSync(configPath, 'utf8'))
  const configItems = loaded.map(config => {
    if (mockMode) {
      const mockConfig = config as MockConfig
      const mockPath = mockConfig.response.mockPath
      if (mockPath) {
        mockConfig.response.mockBody = JSON.parse(readFileSync(mockPath, 'utf-8'))
      }
    }
    return config
  })

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
    throw new CustomError(`${chalk.bold('Config error:')} ${err.message}`)
  }
}
