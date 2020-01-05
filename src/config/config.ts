import * as yup from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileSync } from 'fs'
import { readFileAsync } from '../io'
import chalk from 'chalk'
import {
  OldRequestConfig,
  OldMockRequestConfig,
  requestSchema,
  mapRequestConfig,
  TestRequestSchema,
} from './request'
import { RequestConfigArray } from '.'
import {
  OldResponseConfig,
  OldMockResponseConfig,
  oldResponseSchema,
  ResponseConfig,
  mapResponseConfig,
} from './response'
import TypeValidator from '../validation/type-validator'

export interface Config {
  name: string
  requests: RequestConfigArray
  response: ResponseConfig
}

export interface TestConfig {
  name: string
  request: OldRequestConfig
  response: OldResponseConfig
}

export interface MockConfig extends TestConfig {
  request: OldMockRequestConfig
  response: OldMockResponseConfig
}

export interface ConfigSchema {
  name: string
  request: { [index: string]: any }
  response: { [index: string]: any }
}

const configSchema = yup.array().of<ConfigSchema>(
  yup.object({
    name: yup.string().required(),
    request: yup.object().required(),
    response: yup.object().required(),
  }),
)

export enum Mode {
  Test = 'Test',
  Serve = 'Serve',
}

export async function readConfig(
  configPath: string,
  typeValidator: TypeValidator,
  mode: Mode.Test | Mode.Serve,
): Promise<Config[]> {
  const rawConfig = safeLoad(await readFileAsync(configPath))
  const configs = (await configSchema.validate(rawConfig)).filter(
    x => mode === Mode.Serve || x.request.endpoints,
  )

  return await Promise.all(
    configs.map<Promise<Config>>(async ({ name, request, response }) => ({
      name: name,
      requests: await mapRequestConfig(request, typeValidator, mode),
      response: await mapResponseConfig(response, typeValidator, mode),
    })),
  )
}

export default function readConfigOld<T extends TestConfig>(configPath: string): T[] {
  const rawConfig = readFileSync(configPath, 'utf8')
  const configItems: T[] = safeLoad(rawConfig)

  try {
    yup
      .array()
      .of(
        yup
          .object({
            name: yup.string().required(),
            request: requestSchema,
            response: oldResponseSchema,
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
