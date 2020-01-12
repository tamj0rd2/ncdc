import * as yup from 'yup'
import { baseRequestSchema, endpointsSchema, endpointSchema } from './schema-shared'
import '../methods'

export const serveRequestSchema = baseRequestSchema
  .shape({
    endpoints: endpointsSchema.requiredIfNoSiblings('serveEndpoint'),
    serveEndpoint: endpointSchema.requiredIfNoSiblings('endpoints'),
    serveBody: yup.mixed<Data>().notAllowedIfSiblings('body', 'bodyPath', 'serveBodyPath'),
    serveBodyPath: yup.string().notAllowedIfSiblings('body', 'bodyPath', 'serveBody'),
  })
  .allowedKeysOnly()

export type ServeRequestSchema = yup.InferType<typeof serveRequestSchema>
