import { InferType } from 'yup'
import { baseRequestSchema, endpointsSchema } from './schema-shared'
import enrichYup from '../methods'

enrichYup()

export const testRequestSchema = baseRequestSchema
  .shape({
    endpoints: endpointsSchema.when('serveOnly', {
      is: true,
      then: endpointsSchema.notRequired(),
      otherwise: endpointsSchema.required(),
    }),
  })
  .allowedKeysOnly('serveEndpoint', 'serveBody', 'serveBodyPath')

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getTestSchema = (serveOnly: boolean) =>
  baseRequestSchema
    .shape({ endpoints: serveOnly ? endpointsSchema.notRequired() : endpointsSchema.required() })
    .allowedKeysOnly('serveEndpoint', 'serveBody', 'serveBodyPath')

export type TestRequestSchema = InferType<ReturnType<typeof getTestSchema>>
