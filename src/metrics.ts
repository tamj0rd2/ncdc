import { blue, red, green } from 'chalk'
import { NcdcLogger } from '~logger'

enum MetricState {
  Started = 'started',
  Failed = 'failed',
  Completed = 'completed',
}

export default class Metrics {
  private startTime: Date

  constructor(private readonly logger: NcdcLogger) {
    this.startTime = new Date()
  }

  public reportOperation = (action: string): OperationResult => {
    const operationStartTime = new Date()
    this.logger.debug(`Metric: ${action} - ${blue(MetricState.Started)}`)

    const endOperation = (state: MetricState.Completed | MetricState.Failed): void => {
      const endTime = new Date()
      const timeTaken = blue(this.getTimeDifference(operationStartTime, endTime))
      const elapsedTime = blue(this.getTimeDifference(this.startTime, endTime))
      const message = state === MetricState.Completed ? green(state) : red(state)
      this.logger.debug(
        `Metric: ${action} - ${message} | time taken: ${timeTaken} | elapsed time: ${elapsedTime}`,
      )
    }

    return {
      success: () => endOperation(MetricState.Completed),
      fail: () => endOperation(MetricState.Failed),
    }
  }

  private getTimeDifference = (startTime: Date, endTime: Date): string =>
    ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2) + 's'
}

export interface OperationResult {
  success(): void
  fail(): void
}
