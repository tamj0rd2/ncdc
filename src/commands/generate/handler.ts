import { SchemaRetriever } from '~schema'
import { Generate } from './generate'
import { NcdcLogger } from '~logger'
import { Type } from '~config/resource/type'

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
  getConfigTypes: GetConfigTypes
  getSchemaGenerator: GetSchemaGenerator
  generate: Generate
}

export type GetSchemaGenerator = (tsconfigPath: string, force: boolean) => SchemaRetriever
export type GetConfigTypes = (configPaths: string[]) => Promise<Type[]>

const createHandler = (getGeneratorDeps: GetGenerateDeps) => async (args: GenerateArgs): Promise<void> => {
  const { logger, generate, getConfigTypes, getSchemaGenerator } = getGeneratorDeps(args)
  if (!args.configPaths) throw new Error('at least 1 ncdc config path must be given')

  const types = await getConfigTypes(args.configPaths)
  if (!types.length) {
    logger.warn('No types were specified in the given config file')
    return
  }

  const schemaRetriever = getSchemaGenerator(args.tsconfigPath, args.force)

  await generate(schemaRetriever, types, args.outputPath)
  logger.info('JSON schemas have been written to disk')
}

export default createHandler
