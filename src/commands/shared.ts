import { NcdcLogger } from '~logger'
import { OperationResult } from '~metrics'

export type HandleError = (error: { message: string }) => never

export type ReportMetric = (operation: string) => OperationResult

export type GetRootDeps = (
  verbose: boolean,
) => {
  logger: NcdcLogger
  handleError: HandleError
  reportMetric: ReportMetric
}
