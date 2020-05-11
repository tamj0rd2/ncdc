import logger from '~logger'

let startTime: Date
let previousMetricTime: Date

const calcDiff = (startTime: Date, endTime: Date): number =>
  Math.round(endTime.getTime() - startTime.getTime()) / 1000

export const logMetric = (message: string): void => {
  if (!startTime) {
    startTime = new Date()
    previousMetricTime = startTime
    logger.debug(`Metric | ${message}`)
    return
  }

  const timeNow = new Date()
  const timeDiff = calcDiff(previousMetricTime, timeNow)
  const elapsedDiff = calcDiff(startTime, timeNow)
  logger.debug(`Metric | ${message} | diff: ${timeDiff} | full diff: ${elapsedDiff}`)
  previousMetricTime = timeNow
}
