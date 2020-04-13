import { mixed, string, InferType } from 'yup'
import { baseRequestSchema, endpointsSchema, endpointSchema } from './schema-shared'
import enrichYup from '../methods'

enrichYup()

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getServeSchema = () =>
  baseRequestSchema
    .shape({
      endpoints: endpointsSchema.requiredIfNoSiblings('serveEndpoint'),
      serveEndpoint: endpointSchema.requiredIfNoSiblings('endpoints'),
    })
    .allowedKeysOnly()

export type ServeRequestSchema = InferType<ReturnType<typeof getServeSchema>>
