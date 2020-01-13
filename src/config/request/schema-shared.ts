import { string, array, object, mixed } from 'yup'
import { IncomingHttpHeaders } from 'http'
import enrichYup from '../methods'

enrichYup()

export const endpointSchema = string().startsWith('/')

export const endpointsSchema = array()
  .of(endpointSchema)
  .transform((_, oValue) => (Array.isArray(oValue) ? oValue : [oValue]))

export type SupportedMethod = 'GET' | 'POST'

export const baseRequestSchema = object({
  method: mixed<SupportedMethod>()
    .oneOf(['GET', 'POST'])
    .required(),
  type: string()
    .test('withoutSpaces', '${path} should not contain spaces', (value = '') => value.indexOf(' ') === -1)
    .notRequired(),
  body: mixed<Data>().notAllowedIfSiblings('bodyPath'),
  bodyPath: string().notAllowedIfSiblings('body'),
  headers: object<IncomingHttpHeaders>()
    .ofHeaders()
    .notRequired(),
}).allowedKeysOnly()
