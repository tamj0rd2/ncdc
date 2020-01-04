import { Data } from '../types'
import * as yup from 'yup'
import { OutgoingHttpHeaders } from 'http'
import { readJsonAsync } from '../io'
import './methods'

export interface OldResponseConfig {
  code: number
  body?: Data
  type?: string
  headers?: OutgoingHttpHeaders
}

export interface OldMockResponseConfig extends OldResponseConfig {
  mockBody?: Data
  mockPath?: string
}

const stringOrObject = yup.lazy(val => (typeof val === 'string' ? yup.string() : yup.object()))

export const oldResponseSchema = yup
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

// =====================
// NEW STUFF :D
// =====================
export interface ResponseConfig {
  code: number
  body?: Data
  headers?: OutgoingHttpHeaders // TODO: literally unused right now. Needs to be checked in test mode and sent in serve mode
  type?: string // TODO: only necessary for validation, pre server instantiation. should just be done here...
}

const baseResponseSchema = yup.object({
  code: yup.number().required(),
  body: yup.mixed<Data>().notAllowedIfSiblings('bodyPath'),
  bodyPath: yup.string().notAllowedIfSiblings('body'),
  headers: yup
    .object<OutgoingHttpHeaders>()
    .test('hasValidHeaders', '', function(headers) {
      const firstInvalidField = Object.keys(headers ?? {}).find(key => {
        const value = headers[key]

        return Array.isArray(value)
          ? value.find(x => typeof x !== 'string')
          : !['string', 'number', 'undefined'].includes(typeof value)
      })

      if (!firstInvalidField) return true

      return this.createError({
        path: this.path,
        message: `${this.path}.${firstInvalidField} should be of type: string | number | string[] | undefined`,
      })
    })
    .notRequired(),
  type: yup.string().notRequired(),
})

const testResponseSchema = baseResponseSchema

const serveResponseSchema = baseResponseSchema.shape({
  serveBody: yup.mixed<Data>().notAllowedIfSiblings('body, bodyPath, serveBodyPath'),
  serveBodyPath: yup.string().notAllowedIfSiblings('body, bodyPath, serveBody'),
})

export const mapTestResponseConfig = async (responseConfig: object): Promise<ResponseConfig> => {
  const validatedConfig = await testResponseSchema.validate(responseConfig)
  const { body, bodyPath, code, type, headers } = validatedConfig

  return {
    code,
    body: bodyPath ? await readJsonAsync(bodyPath) : body,
    type,
    headers,
  }
}

export const mapServeResponseConfig = async (responseConfig: object): Promise<ResponseConfig> => {
  const validatedConfig = await serveResponseSchema.validate(responseConfig)
  const { body, bodyPath, serveBody, serveBodyPath, code, type, headers } = validatedConfig

  let bodyToUse: Optional<Data>
  if (body) bodyToUse = body
  else if (bodyPath) bodyToUse = await readJsonAsync(bodyPath)
  else if (serveBody) bodyToUse = serveBody
  else if (serveBodyPath) bodyToUse = await readJsonAsync(serveBodyPath)

  return {
    code,
    body: bodyToUse,
    type,
    headers,
  }
}
