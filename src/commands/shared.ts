import { NcdcLogger } from '~logger'
import { OperationResult } from '~metrics'
import { CommandModule as YargsCommandModule, Argv } from 'yargs'

export type HandleError = (error: { message: string }) => never

export type ReportMetric = (operation: string) => OperationResult

export type GetRootDeps = (
  verbose: boolean,
) => {
  logger: NcdcLogger
  handleError: HandleError
  reportMetric: ReportMetric
}

export interface CommandModule<Args> extends YargsCommandModule<{}, Args> {
  command: string
  describe: string
  builder(yargs: Argv): Argv<Args>
  handler(args: Args): Promise<void>
}
