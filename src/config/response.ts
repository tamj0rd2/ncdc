import { Data } from '../types'
import * as yup from 'yup'
import { OutgoingHttpHeaders } from 'http'

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
