import { object, number, mixed, string, InferType } from 'yup'
import { OutgoingHttpHeaders } from 'http'
import { TypeValidator, TypeValidationError } from '~validation'
import { ProblemType } from '~problem'
import { GetBodyToUse } from './body'
import enrichYup from './methods'

enrichYup()

export interface ResponseConfig {
  code: number
  body?: Data
  headers?: OutgoingHttpHeaders // TODO: unused right now. Needs to be checked in test mode and sent in serve mode
  type?: string
}

const baseResponseSchema = object({
  code: number().required(),
  body: mixed<Data>().notAllowedIfSiblings('bodyPath'),
  bodyPath: string().notAllowedIfSiblings('body'),
  headers: object<OutgoingHttpHeaders>()
    .ofHeaders()
    .notRequired(),
  type: string().notRequired(),
})

// TODO: needs tests
export const testResponseSchema = baseResponseSchema.allowedKeysOnly('serveBody', 'serveBodyPath')
type TestResponseSchema = InferType<typeof testResponseSchema>

export const serveResponseSchema = baseResponseSchema
  .shape({
    serveBody: mixed<Data>().notAllowedIfSiblings('body, bodyPath, serveBodyPath'),
    serveBodyPath: string().notAllowedIfSiblings('body, bodyPath, serveBody'),
  })
  .allowedKeysOnly()
type ServeResponseSchema = InferType<typeof serveResponseSchema>

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
    if (problems) {
      const error = new TypeValidationError(problems)
      throw error
    }
  }

  return {
    code,
    body: bodyToUse,
    headers,
    type,
  }
}
