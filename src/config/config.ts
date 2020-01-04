import * as yup from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileSync } from 'fs'
import { readFileAsync } from '../io'
import chalk from 'chalk'
import { OldRequestConfig, OldMockRequestConfig, requestSchema, mapTestRequestConfig } from './request'
import { RequestConfigArray } from '.'
import { ResponseConfig, MockResponseConfig, responseSchema } from './response'

export interface Config {
  name: string
  requests: RequestConfigArray
  response: {}
}

export interface TestConfig {
  name: string
  request: OldRequestConfig
  response: ResponseConfig
}

export interface MockConfig extends TestConfig {
  request: OldMockRequestConfig
  response: MockResponseConfig
}

export interface ConfigSchema {
  name: string
  request: object
  response: object
}

const configSchema = yup.array().of<ConfigSchema>(
  yup.object({
    name: yup.string().required(),
    request: yup.object().required(),
    response: yup.object().required(),
  }),
)

export async function readTestConfig(configPath: string): Promise<Config[]> {
  const rawConfig = safeLoad(await readFileAsync(configPath))
  const configs = await configSchema.validate(rawConfig)

  return await Promise.all(
    configs.map<Promise<Config>>(async ({ name, request }) => ({
      name: name,
      requests: await mapTestRequestConfig(request),
      response: {},
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

// TODO: Create a GenerateConfig because we don't really want to do a big validation just to get a list of types
