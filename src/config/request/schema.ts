import * as yup from 'yup'
import { IncomingHttpHeaders } from 'http'
import '../methods'

export type SupportedMethod = 'GET' | 'POST'

const endpointSchema = yup.string().startsWith('/')

const endpointsSchema = yup
  .array()
  .of(endpointSchema)
  .transform((_, oValue) => (Array.isArray(oValue) ? oValue : [oValue]))

export const baseRequestConfigSchema = yup.object({
  method: yup
    .mixed<SupportedMethod>()
    .oneOf(['GET', 'POST'])
    .required(),
  type: yup
    .string()
    .test('withoutSpaces', '${path} should not contain spaces', (value = '') => value.indexOf(' ') === -1)
    .notRequired(),
  body: yup.mixed<Data>().notAllowedIfSiblings('bodyPath'),
  bodyPath: yup.string().notAllowedIfSiblings('body'),
  headers: yup
    .object<IncomingHttpHeaders>()
    .ofHeaders()
    .notRequired(),
  serveOnly: yup.bool().default(false),
})

export const testRequestSchema = baseRequestConfigSchema
  .shape({
    endpoints: endpointsSchema.when('serveOnly', {
      is: true,
      then: endpointsSchema.notRequired(),
      otherwise: endpointsSchema.required(),
    }),
  })
  .allowedKeysOnly('serveEndpoint', 'serveBody', 'serveBodyPath')

export type TestRequestSchema = yup.InferType<typeof testRequestSchema>
