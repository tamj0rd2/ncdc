import { InferType } from 'yup'
import { baseRequestSchema, endpointsSchema } from './schema-shared'
import enrichYup from '../methods'

enrichYup()

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getTestSchema = (serveOnly = false) =>
  baseRequestSchema
    .shape({ endpoints: serveOnly ? endpointsSchema.notRequired() : endpointsSchema.required() })
    .allowedKeysOnly('serveEndpoint', 'serveBody', 'serveBodyPath')

export type TestRequestSchema = InferType<ReturnType<typeof getTestSchema>>
