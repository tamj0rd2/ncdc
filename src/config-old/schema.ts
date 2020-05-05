import { object, string, bool, InferType } from 'yup'
import { TestRequestSchema, getTestSchema, getServeSchema } from './request'
import { Mode } from './types'
import { testResponseSchema, serveResponseSchema } from './response'
import { ServeRequestSchema } from './request/serve-schema'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getConfigSchema = (mode: Mode) => {
  const serveSchema = getServeSchema()
  return object({
    name: string().required(),
    serveOnly: bool().default(false),
    request: object<TestRequestSchema | ServeRequestSchema>()
      .when('serveOnly', {
        is: false,
        then: mode === Mode.Test ? getTestSchema().required() : serveSchema.required(),
        otherwise: mode === Mode.Test ? getTestSchema(true).required() : serveSchema.required(),
      })
      .required(),
    response: (mode === Mode.Test ? testResponseSchema : serveResponseSchema).required(),
  })
}

export type ConfigSchema = InferType<ReturnType<typeof getConfigSchema>>
