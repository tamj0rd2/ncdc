import logger from '~logger'
import { blue, red, green } from 'chalk'

const calcDiff = (startTime: Date, endTime: Date): string =>
  ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2) + 's'

export enum MetricState {
  Started = 'started',
  Failed = 'failed',
  Completed = 'completed',
}

let startTime: Date

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const startOperation = (action: string) => {
  const operationStartTime = new Date()
  if (!startTime) startTime = new Date()
  logger.debug(`Metric: ${action} - ${blue(MetricState.Started)}`)

  const endOperation = (state: MetricState.Completed | MetricState.Failed): void => {
    const endTime = new Date()
    const timeTaken = blue(calcDiff(operationStartTime, endTime))
    const elapsedTime = blue(calcDiff(startTime, endTime))
    const message = state === MetricState.Completed ? green(state) : red(state)
    logger.debug(`Metric: ${action} - ${message} | time taken: ${timeTaken} | elapsed time: ${elapsedTime}`)
  }

  return {
    success: () => endOperation(MetricState.Completed),
    fail: () => endOperation(MetricState.Failed),
  }
}
