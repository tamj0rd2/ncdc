import { SchemaRetriever } from '~schema'
import { Generate } from './generate'
import { HandleError } from '~commands/shared'
import { NcdcLogger } from '~logger'

export interface GenerateArgs {
  configPaths?: string[]
  tsconfigPath: string
  outputPath: string
  force: boolean
  verbose: boolean
}

export type GetGenerateDeps = (args: GenerateArgs) => GenerateDeps
export interface GenerateDeps {
  logger: NcdcLogger
  handleError: HandleError
  getConfigTypes: GetConfigTypes
  getSchemaGenerator: GetSchemaGenerator
  generate: Generate
}

export type GetSchemaGenerator = (tsconfigPath: string, force: boolean) => SchemaRetriever
export type GetConfigTypes = (configPaths: string[]) => Promise<string[]>

const createHandler = (getGeneratorDeps: GetGenerateDeps) => async (args: GenerateArgs): Promise<void> => {
  const { handleError, logger, generate, getConfigTypes, getSchemaGenerator } = getGeneratorDeps(args)
  if (!args.configPaths) return handleError(new Error('at least 1 ncdc config path must be given'))

  let types: string[]
  try {
    types = await getConfigTypes(args.configPaths)
  } catch (err) {
    return handleError(err)
  }

  if (!types.length) {
    logger.warn('No types were specified in the given config file')
    return
  }

  let schemaRetriever: SchemaRetriever

  try {
    schemaRetriever = getSchemaGenerator(args.tsconfigPath, args.force)
  } catch (err) {
    return handleError(err)
  }

  try {
    await generate(schemaRetriever, types, args.outputPath)
  } catch (err) {
    return handleError(err)
  } finally {
    logger.info('JSON schemas have been written to disk')
  }
}

export default createHandler
