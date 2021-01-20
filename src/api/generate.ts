/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-interface */
import { ReportMetric } from '~commands/shared'
import { NcdcLogger } from '~logger'
import { GenerateService } from './types'

export function generate(
  services: GenerateService[],
  config: GenerateConfig,
  deps: GenerateDeps,
): Promise<GenerateResults> {
  throw new Error('Not yet implemented')
}

export interface GenerateResults {}

export interface GenerateConfig {}

interface GenerateDeps {
  logger: NcdcLogger
  reportMetric: ReportMetric
}
