import { Data } from '../types'
import * as yup from 'yup'
import './methods'

export type SupportedMethod = 'GET' | 'POST'

export const testRequestSchema = yup
  .object()
  .shape({
    method: yup
      .mixed<SupportedMethod>()
      .oneOf(['GET', 'POST'])
      .required(),
    endpoints: yup
      .array()
      .of(yup.string())
      .transform(function(val, originalValue: string | string[]) {
        if (typeof originalValue === 'string') return [originalValue]
        if (originalValue.filter(x => typeof x !== 'string').length === 0) return originalValue
        return null
      })
      .required(),
    type: yup.string().notRequired(),
    body: yup.mixed<Data>().notAllowedIf('bodyPath', bodyPath => !!bodyPath),
    bodyPath: yup.string().notAllowedIf('body', body => !!body),
  })
  .allowedKeysOnly('serveEndpoint')

export interface TestRequestConfig {
  method: SupportedMethod
  endpoint: string
  type?: string
  body?: Data
}

type Blah = yup.InferType<typeof testRequestSchema>

// export const mapTestRequestConfig = (config: yup.InferType<typeof testRequestSchema>): TestRequestConfig => {
//   let params: string[][] | undefined

//   if (config.params) {
//   }

//   return {
//     method: config.method,
//   }
// }

export const serveRequestSchema = yup
  .object({
    method: yup
      .string()
      .oneOf(['GET', 'POST'])
      .required(),
    endpoint: yup.string().requiredIf<string>('serveEndpoint', serveEndpoint => !serveEndpoint),
    serveEndpoint: yup.string().requiredIf<string>('endpoint', endpoint => !endpoint),
    type: yup.string().notRequired(),
    body: yup.mixed<Data>().notAllowedIf('bodyPath', bodyPath => !!bodyPath),
    bodyPath: yup.string().notAllowedIf('body', body => !!body),
    // NOTE: mockBody/mockPath should only be used in cases where a body or bodypath isn't specified.
    // This apeases the case where someone might want to do a cdc test where they don't check the boxy
    // while still being able to have a body available in serve mode
    mockBody: yup.mixed<Data>().notAllowedIf(['body', 'bodyPath', 'mockBodyPath'], value => !!value),
    mockBodyPath: yup.string().notAllowedIf(['body', 'bodyPath', 'mockBody'], value => !!value),
  })
  .allowedKeysOnly()

export interface RequestConfig {
  endpoints: string[]
  method: SupportedMethod
  type?: string
  body?: Data
}

export interface MockRequestConfig extends RequestConfig {
  mockEndpoint?: string
}

const stringOrObject = yup.lazy(val => (typeof val === 'string' ? yup.string() : yup.object()))

export const requestSchema = yup
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
