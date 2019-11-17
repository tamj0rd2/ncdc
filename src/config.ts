import * as yup from 'yup'

type Endpoint = string

interface RequestConfig {
  endpoint: Endpoint
  method: 'GET'
}

interface ResponseConfig {
  code?: number
  body?: string | object
  type?: string
}

export interface TestConfig {
  name: string
  request: RequestConfig | string
  response: ResponseConfig
}

export default class NConfig {
  public constructor(public readonly tests: TestConfig[] = []) {}

  public static fromJSON(obj: any): NConfig | never {
    NConfig.configSchema.validateSync(obj, { strict: true })
    return new NConfig(obj.tests)
  }

  public static configSchema = yup
    .object({
      tests: yup.array().of(
        yup
          .object({
            name: yup.string().required(),
            request: yup.lazy(val => {
              return typeof val === 'object'
                ? yup
                    .object({
                      endpoint: yup.string().required(),
                      method: yup
                        .string()
                        .required()
                        .oneOf(['GET']),
                    })
                    .noUnknown(true)
                    .required()
                : yup.string().required()
            }),
            response: yup
              .object({
                code: yup.number(),
                body: yup.lazy(val => (typeof val === 'string' ? yup.string() : yup.object())),
                type: yup.string(),
              })
              .noUnknown(true)
              .required(),
          })
          .noUnknown(true),
      ),
    })
    .noUnknown(true)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRequestConfig(x: any): x is RequestConfig {
  return 'endpoint' in x
}
