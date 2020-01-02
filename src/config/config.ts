import * as yup from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileSync } from 'fs'
import chalk from 'chalk'
import { RequestConfig, MockRequestConfig, requestSchema } from './request'
import { ResponseConfig, MockResponseConfig, responseSchema } from './response'

export interface TestConfig {
  name: string
  request: RequestConfig
  response: ResponseConfig
}

export interface MockConfig extends TestConfig {
  request: MockRequestConfig
  response: MockResponseConfig
}

export default function readConfig<T extends TestConfig>(configPath: string): T[] {
  const configItems: T[] = safeLoad(readFileSync(configPath, 'utf8'))

  try {
    yup
      .array()
      .of(
        yup
          .object({
            name: yup.string().required(),
            request: requestSchema,
            response: responseSchema,
          })
          .noUnknown(true),
      )
      .required()
      .validateSync(configItems, { strict: true })
    return configItems
  } catch (err) {
    throw new Error(`${chalk.bold('Config error:')} ${err.message}`)
  }
}
