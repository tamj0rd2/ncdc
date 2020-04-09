import { HandleError } from '~commands'
import { GenerateConfig, ReadGenerateConfig } from './config'
import { SchemaGenerator } from '~schema'
import { Generate } from './generate'
import { Logger } from 'winston'

export interface GenerateArgs {
  configPath?: string
  tsconfigPath: string
  outputPath: string
  force: boolean
}

export type GetSchemaGenerator = (tsconfigPath: string, isDevMode: boolean) => SchemaGenerator

const createHandler = (
  handleError: HandleError,
  isDevMode: boolean,
  readGenerateConfig: ReadGenerateConfig,
  getSchemaGenerator: GetSchemaGenerator,
  generate: Generate,
  logger: Logger,
) => async (args: GenerateArgs): Promise<void> => {
  const { tsconfigPath, configPath, outputPath, force } = args
  if (!configPath) return handleError(new Error('configPath must be specified'))

  let configs: GenerateConfig[]
  try {
    configs = await readGenerateConfig(configPath)
  } catch (err) {
    return handleError(err)
  }

  const builtInTypes = ['string', 'number', 'boolean', 'object']
  const types = configs
    .map((x) => x.request.type)
    .concat(configs.map((x) => x.response.type))
    .filter((x): x is string => !!x)
    .filter((x) => !builtInTypes.includes(x))
    .filter((x, i, arr) => i === arr.indexOf(x))

  if (!types.length) {
    logger.info('No custom types were specified in the given config file')
    return
  }

  let schemaGenerator: SchemaGenerator

  try {
    schemaGenerator = getSchemaGenerator(tsconfigPath, force || isDevMode)
  } catch (err) {
    handleError(err)
  }

  try {
    await generate(schemaGenerator, types, outputPath)
  } catch (err) {
    return handleError(err)
  } finally {
    logger.info('JSON schemas have been written to disk')
  }
}

export default createHandler
