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

export interface ConfigItem {
  name: string
  request: RequestConfig
  response: ResponseConfig
}

export default class NConfig {
  public readonly configItems: ConfigItem[]

  public constructor(configItems: any[] = []) {
    NConfig.configSchema.validateSync(configItems, { strict: true })
    this.configItems = configItems
  }

  private static configSchema = yup
    .array()
    .of(
      yup
        .object({
          name: yup.string().required(),
          request: yup
            .object({
              endpoint: yup.string().required(),
              method: yup
                .string()
                .required()
                .oneOf(['GET']),
            })
            .noUnknown(true)
            .required(),
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
    )
    .required()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRequestConfig(x: any): x is RequestConfig {
  return 'endpoint' in x
}
