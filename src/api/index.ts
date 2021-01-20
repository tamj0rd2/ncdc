import { generate, GenerateConfig, GenerateResults } from './generate'
import { test, TestConfig, TestResults } from './test'
import { serve, ServeConfig, ServeResult } from './serve'
import { CommonConfig, GenerateService, ServeService, ServiceInput, TestService } from './types'
import createNcdcLogger, { NcdcLogger } from '~logger'
import MetricsReporter, { OperationResult } from '~metrics'
import { ReportMetric } from '~commands/shared'

export * from './serve'
export * from './generate'
export * from './test'
export * from './types'

// TODO: run the type validator when this thingy starts to make sure that all bodies etc are available and correct
export class NCDC {
  private readonly logger: NcdcLogger
  private readonly reportMetric: ReportMetric
  private readonly runtimeMetric: OperationResult

  constructor(private readonly rawServices: ServiceInput[], private readonly commonConfig: CommonConfig) {
    this.logger = createNcdcLogger(commonConfig.verbose ?? false)
    this.reportMetric = new MetricsReporter(this.logger).report
    this.runtimeMetric = this.reportMetric('Program')
  }

  public generate = (config: Omit<GenerateConfig, keyof CommonConfig>): Promise<GenerateResults> =>
    generate(
      this.rawServices.map((s) => new GenerateService(s)),
      config,
      { logger: this.logger, reportMetric: this.reportMetric },
    )
      .then(this.handleSuccess)
      .catch(this.handleError)

  public serve = (config: Omit<ServeConfig, keyof CommonConfig>): Promise<ServeResult> =>
    serve(
      this.rawServices.map((s) => new ServeService(s)),
      { ...this.commonConfig, ...config },
      { logger: this.logger, reportMetric: this.reportMetric },
    )
      .then(this.handleSuccess)
      .catch(this.handleError)

  public test = (config: Omit<TestConfig, keyof CommonConfig>): Promise<TestResults> =>
    test(
      this.rawServices.map((s) => new TestService(s)),
      { ...this.commonConfig, ...config },
      { logger: this.logger, reportMetric: this.reportMetric },
    )
      .then(this.handleSuccess)
      .catch(this.handleError)

  private handleSuccess = <T>(anything: T): T => {
    this.runtimeMetric.success()
    return anything
  }

  private handleError = (err: Error): never => {
    this.runtimeMetric.fail()
    this.logger.error(err.message)
    throw err
  }
}
