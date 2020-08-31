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

interface CommonOptions {
  tsconfigPath: string
  schemaPath?: string
  verbose: boolean
  force: boolean
}

export interface CommandModule<Args> extends YargsCommandModule<CommonOptions, Args> {
  command: string
  describe: string
  builder(yargs: Argv<CommonOptions>): Argv<Args>
  handler(args: Args): Promise<void>
}
