import { array, object, string, bool, InferType } from 'yup'
import { TestRequestSchema, getTestSchema, getServeSchema } from './request'
import { Mode } from './types'
import { testResponseSchema, serveResponseSchema } from './response'

const serveSchema = getServeSchema()

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const configSchema = (mode: Mode) =>
  array().of(
    object({
      name: string().required(),
      serveOnly: bool().default(false),
      request: object<TestRequestSchema>()
        .when('serveOnly', {
          is: false,
          then: mode === Mode.Test ? getTestSchema().required() : serveSchema.required(),
          otherwise: mode === Mode.Test ? getTestSchema(true).required() : serveSchema.required(),
        })
        .required(),
      response: (mode === Mode.Test ? testResponseSchema : serveResponseSchema).required(),
    }),
  )

export type ConfigSchema = InferType<ReturnType<typeof configSchema>>[0]
