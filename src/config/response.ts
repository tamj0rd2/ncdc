import * as yup from 'yup'
import { OutgoingHttpHeaders } from 'http'
import './methods'
import { TypeValidator, TypeValidationError } from '~validation'
import { ProblemType } from '~problem'
import { GetBodyToUse } from './body'

export interface ResponseConfig {
  code: number
  body?: Data
  headers?: OutgoingHttpHeaders // TODO: unused right now. Needs to be checked in test mode and sent in serve mode
  type?: string
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

// TODO: needs tests
export const testResponseSchema = baseResponseSchema.allowedKeysOnly('serveBody', 'serveBodyPath')
type TestResponseSchema = yup.InferType<typeof testResponseSchema>

export const serveResponseSchema = baseResponseSchema
  .shape({
    serveBody: yup.mixed<Data>().notAllowedIfSiblings('body, bodyPath, serveBodyPath'),
    serveBodyPath: yup.string().notAllowedIfSiblings('body, bodyPath, serveBody'),
  })
  .allowedKeysOnly()
type ServeResponseSchema = yup.InferType<typeof serveResponseSchema>

export type ResponseSchema = TestResponseSchema | ServeResponseSchema

export const mapResponseConfig = async (
  validatedConfig: ResponseSchema,
  typeValidator: TypeValidator,
  getResponseBody: GetBodyToUse,
): Promise<ResponseConfig> => {
  const { code, type, headers } = validatedConfig

  const bodyToUse = await getResponseBody(validatedConfig)

  if (bodyToUse && type) {
    const problems = await typeValidator.getProblems(bodyToUse, type, ProblemType.Response)
    if (problems) throw new TypeValidationError(problems)
  }

  return {
    code,
    body: bodyToUse,
    headers,
    type,
  }
}
