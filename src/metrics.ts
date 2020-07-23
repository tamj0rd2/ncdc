import { blue, red, green } from 'chalk'
import { NcdcLogger } from '~logger'

class Metric implements OperationResult {
  private readonly operationStartTime: Date
  private readonly messagePrefix: string

  constructor(
    private readonly programStartTime: Date,
    private readonly logger: NcdcLogger,
    action: string,
    private readonly parent?: Metric,
  ) {
    this.operationStartTime = new Date()
    this.messagePrefix = `${' '.repeat(this.parent ? 4 : 0)}Metric: ${action} -`
    this.logger.debug(`${this.messagePrefix} ${blue('started')}`)
  }

  public subMetric = (action: string): Metric => new Metric(this.programStartTime, this.logger, action)

  public success = (): void => this.endOperation(true)

  public fail = (): void => {
    this.endOperation(false)
    this.parent?.fail()
  }

  private endOperation(success: boolean): void {
    const endTime = new Date()
    const timeTaken = blue(this.getTimeDifference(this.operationStartTime, endTime))
    const elapsedTime = blue(this.getTimeDifference(this.programStartTime, endTime))
    const message = success ? green('completed') : red('failed')
    this.logger.debug(
      `${this.messagePrefix} ${message} | time taken: ${timeTaken} | elapsed time: ${elapsedTime}`,
    )
  }

  private getTimeDifference(startTime: Date, endTime: Date): string {
    return ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2) + 's'
  }
}

export default class MetricsReporter {
  private startTime: Date

  constructor(private readonly logger: NcdcLogger) {
    this.startTime = new Date()
  }

  public report = (action: string): OperationResult => {
    return new Metric(this.startTime, this.logger, action)
  }
}

export interface OperationResult {
  success(): void
  fail(): void
  subMetric(action: string): OperationResult
}
