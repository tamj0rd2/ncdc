import { array } from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileAsync } from '~io'
import { RequestConfig } from './request'
import { ResponseConfig } from './response'
import { TypeValidator } from '~validation'
import { createGetBodyToUse } from './body'
import { Mode } from './types'
import { getConfigSchema } from './schema'
import { mapConfig, containsProblemResult, isProblemResult } from './mapper'
import logger from '~logger'
import { validationFailed } from '~messages'

export interface Config {
  name: string
  request: RequestConfig
  response: ResponseConfig
}

export default async function readConfig(
  configPath: string,
  typeValidator: TypeValidator,
  mode: Mode.Test | Mode.Serve,
): Promise<Config[]> {
  const rawConfigs = safeLoad(await readFileAsync(configPath))
  if (!Array.isArray(rawConfigs)) throw new Error('Config file should contain an array of configurations')

  const configs = await array().of(getConfigSchema(mode)).validate(rawConfigs)

  const getBody = createGetBodyToUse(configPath)

  const mappingResult = await Promise.all(
    configs.filter((x) => mode === Mode.Serve || !x.serveOnly).map(mapConfig(typeValidator, getBody)),
  )

  if (containsProblemResult(mappingResult)) {
    for (const result of mappingResult.filter(isProblemResult)) {
      logger.error(validationFailed(result))
    }

    process.exit(1)
  }

  return mappingResult.flat()
}
