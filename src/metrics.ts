import logger from '~logger'
import { blue, red, green } from 'chalk'

let startTime: Date
let previousMetricTime: Date

const calcDiff = (startTime: Date, endTime: Date): number =>
  Math.round(endTime.getTime() - startTime.getTime()) / 1000

export enum MetricState {
  Started = 'started',
  Failed = 'failed',
  Completed = 'completed',
}

const getMessage = (action: string, state?: MetricState): string => {
  if (!state) return action

  switch (state) {
    case MetricState.Started:
      return `${action} - ${blue(state)}`
    case MetricState.Failed:
      return `${action} - ${red(state)}`
    case MetricState.Completed:
      return `${action} - ${green(state)}`
  }
}

export const logMetric = (action: string, state?: MetricState): void => {
  if (!startTime) {
    startTime = new Date()
    previousMetricTime = startTime
    logger.debug(`Metric: ${action}`)
    return
  }

  const timeNow = new Date()
  const timeDiff = blue(calcDiff(previousMetricTime, timeNow) + 's')
  const elapsedDiff = blue(calcDiff(startTime, timeNow) + 's')

  logger.debug(
    `Metric: ${getMessage(action, state)} | time passed: ${timeDiff} | time since start: ${elapsedDiff}`,
  )
  previousMetricTime = timeNow
}
