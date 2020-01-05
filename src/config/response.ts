import { Data } from '../types'
import * as yup from 'yup'
import { OutgoingHttpHeaders } from 'http'
import { readJsonAsync } from '../io'
import './methods'
import { Mode } from './config'

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
    .ofHeaders()
    .notRequired(),
  type: yup.string().notRequired(),
})

const testResponseSchema = baseResponseSchema

const serveResponseSchema = baseResponseSchema.shape({
  serveBody: yup.mixed<Data>().notAllowedIfSiblings('body, bodyPath, serveBodyPath'),
  serveBodyPath: yup.string().notAllowedIfSiblings('body, bodyPath, serveBody'),
})
type ServeResponseSchema = yup.InferType<typeof serveResponseSchema>

const getResponseBody = async (config: Pick<ServeResponseSchema, BodyKeys>): Promise<Optional<Data>> => {
  const { body, bodyPath, serveBody, serveBodyPath } = config

  if (body) return body
  if (bodyPath) return await readJsonAsync(bodyPath)
  if (serveBody) return serveBody
  if (serveBodyPath) return await readJsonAsync(serveBodyPath)
}

export const mapResponseConfig = async (
  responseConfig: object,
  mode: Mode.Test | Mode.Serve,
): Promise<ResponseConfig> => {
  const schema = mode === Mode.Test ? testResponseSchema : serveResponseSchema
  const validatedConfig = await schema.validate(responseConfig)
  const { code, type, headers } = validatedConfig

  const bodyToUse = await getResponseBody(validatedConfig)

  return {
    code,
    body: bodyToUse,
    type,
    headers,
  }
}
