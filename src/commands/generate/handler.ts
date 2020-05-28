import { HandleError } from '~commands'
import { GenerateConfig, ReadGenerateConfig } from './config'
import { SchemaRetriever } from '~schema'
import { Generate } from './generate'
import { Logger } from 'winston'
import { resolve } from 'path'
import { logMetric } from '~metrics'

export interface GenerateArgs {
  configPath?: string
  tsconfigPath: string
  outputPath: string
  force: boolean
}

export type GetSchemaGenerator = (tsconfigPath: string, force: boolean) => SchemaRetriever

const createHandler = (
  handleError: HandleError,
  readGenerateConfig: ReadGenerateConfig,
  getSchemaGenerator: GetSchemaGenerator,
  generate: Generate,
  logger: Logger,
) => async (args: GenerateArgs): Promise<void> => {
  const { tsconfigPath, configPath, outputPath, force } = args
  if (!configPath) return handleError(new Error('configPath must be specified'))

  let configs: GenerateConfig[]
  try {
    configs = await readGenerateConfig(resolve(configPath))
  } catch (err) {
    return handleError(err)
  }

  const types = configs
    .map((x) => x.request.type)
    .concat(configs.map((x) => x.response.type))
    .filter((x): x is string => !!x)
    .filter((x, i, arr) => i === arr.indexOf(x))

  if (!types.length) {
    logger.warn('No types were specified in the given config file')
    return
  }

  let schemaRetriever: SchemaRetriever

  try {
    schemaRetriever = getSchemaGenerator(tsconfigPath, force)
  } catch (err) {
    return handleError(err)
  }

  try {
    await generate(schemaRetriever, types, outputPath)
  } catch (err) {
    return handleError(err)
  } finally {
    logger.info('JSON schemas have been written to disk')
  }

  logMetric('Happy ending')
}

export default createHandler
