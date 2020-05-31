import { HandleError } from '~commands'
import { SchemaRetriever } from '~schema'
import { Generate } from './generate'
import { Logger } from 'winston'

export interface GenerateArgs {
  configPaths?: string[]
  tsconfigPath: string
  outputPath: string
  force: boolean
}

export type GetSchemaGenerator = (tsconfigPath: string, force: boolean) => SchemaRetriever

export type GetConfigTypes = (configPaths: string[]) => Promise<string[]>

const createHandler = (
  handleError: HandleError,
  getConfigTypes: GetConfigTypes,
  getSchemaGenerator: GetSchemaGenerator,
  generate: Generate,
  logger: Logger,
) => async (args: GenerateArgs): Promise<void> => {
  const { tsconfigPath, configPaths, outputPath, force } = args
  if (!configPaths) return handleError(new Error('at least 1 ncdc config path must be given'))

  let types: string[]
  try {
    types = await getConfigTypes(configPaths)
  } catch (err) {
    return handleError(err)
  }

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
}

export default createHandler
