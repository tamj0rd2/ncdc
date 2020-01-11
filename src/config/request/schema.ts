import * as yup from 'yup'
import { IncomingHttpHeaders } from 'http'
import '../methods'

export type SupportedMethod = 'GET' | 'POST'

const endpointSchema = yup.string().startsWith('/')

const endpointsSchema = yup
  .array()
  .of(endpointSchema)
  .transform((_, oValue) => (Array.isArray(oValue) ? oValue : [oValue]))

const baseRequestConfigSchema = yup.object({
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
})

export const testRequestSchema = baseRequestConfigSchema
  .shape({ endpoints: endpointsSchema.notRequired() })
  .allowedKeysOnly('serveEndpoint', 'serveBody', 'serveBodyPath')
