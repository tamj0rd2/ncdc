import { createHttpClient } from '~commands/test/http-client'
import { runTests } from '~commands/test/test'
import createNcdcLogger from '~logger'
import MetricsReporter from '~metrics'
import TypeValidatorFactory from '~validation'
import { CommonConfig, TestService } from './types'

export async function test(services: TestService[], testConfig: TestConfig): Promise<TestResults> {
  const logger = createNcdcLogger(testConfig.verbose ?? false)
  const metricsReporter = new MetricsReporter(logger)
  const typeValidatorFactory = new TypeValidatorFactory(logger, metricsReporter.report)

  const service = services[0]
  const result = await runTests(
    service.baseUrl,
    createHttpClient(service.baseUrl, testConfig.timeoutMs, testConfig.rateLimit),
    service.resources,
    () => typeValidatorFactory.getValidator(testConfig),
    logger,
    metricsReporter.report,
  )

  if (result === 'Failure') throw new Error('Not all tests passed')
}

export type TestResults = void

export interface TestConfig extends CommonConfig {
  timeoutMs?: number
  rateLimit?: number
}
