import { generate as coreGenerate } from '~commands/generate/generate'
import { ReportMetric } from '~commands/shared'
import { Type } from '~config/resource/type'
import { NcdcLogger } from '~logger'
import { SchemaGenerator, TsHelpers } from '~schema'
import { CommonConfig, GenerateService } from './types'

export async function generate(
  services: GenerateService[],
  config: GenerateConfig,
  deps: GenerateDeps,
): Promise<void> {
  const types = new Set(
    services
      .flatMap((s) => s.resources.flatMap((r) => [r.request.type, r.response.type]))
      .filter((x): x is Type => !!x),
  )

  if (!types.size) {
    deps.logger.warn('No types were specified in the given config file')
    return
  }

  const tsHelpers = new TsHelpers(deps.reportMetric, deps.logger)
  const schemaGenerator = new SchemaGenerator(
    tsHelpers.createProgram(config.tsconfigPath, { shouldTypecheck: !config.force ?? true }),
  )
  schemaGenerator.init()

  await coreGenerate(schemaGenerator, Array.from(types), config.outputPath)
  deps.logger.info('JSON schemas have been written to disk')
}

export type GenerateResults = void

export interface GenerateConfig extends CommonConfig {
  force?: boolean
  outputPath: string
}

interface GenerateDeps {
  logger: NcdcLogger
  reportMetric: ReportMetric
}
