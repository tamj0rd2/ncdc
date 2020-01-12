import * as yup from 'yup'
import { baseRequestSchema, endpointsSchema } from './schema-shared'
import '../methods'

export const testRequestSchema = baseRequestSchema
  .shape({
    endpoints: endpointsSchema.when('serveOnly', {
      is: true,
      then: endpointsSchema.notRequired(),
      otherwise: endpointsSchema.required(),
    }),
  })
  .allowedKeysOnly('serveEndpoint', 'serveBody', 'serveBodyPath')

export type TestRequestSchema = yup.InferType<typeof testRequestSchema>
