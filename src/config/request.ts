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
    endpoint: yup.string().required(),
    params: yup
      .array()
      .of<string | string[]>(
        yup.lazy(val => (typeof val === 'string' ? yup.string() : yup.array().of(yup.string()))),
      )
      .notRequired(),
    body: yup.mixed<Data>().notRequired(),
    type: yup.string().notRequired(),
  })
  .allowedKeysOnly('serveEndpoint')

export type TestRequestConfig = yup.InferType<typeof testRequestSchema>

export const serveRequestSchema = yup
  .object({
    method: yup
      .string()
      .oneOf(['GET', 'POST'])
      .required(),
    endpoint: yup.string().requiredIf('serveEndpoint', serveEndpoint => !serveEndpoint),
    serveEndpoint: yup.string().requiredIf('endpoint', endpoint => !endpoint),
    body: yup.mixed<Data>().notRequired(),
    bodyPath: yup.string().notRequired(),
    type: yup.string().notRequired(),
  })
  .allowedKeysOnly()

export type ServeRequestConfig = yup.InferType<typeof serveRequestSchema>

export interface RequestConfig {
  endpoint: string
  method: SupportedMethod
  type?: string
  body?: Data
  params?: (string | string[])[]
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
