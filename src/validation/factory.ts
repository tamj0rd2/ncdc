import TypeValidator from './type-validator'
import { FsSchemaLoader, SchemaGenerator, WatchingSchemaGenerator } from '~schema'
import Ajv from 'ajv'
import TsHelpers from '~schema/ts-helpers'
import { NcdcLogger } from '~logger'
import { ReportMetric } from '~commands/shared'
import { CompilerHook } from '~schema/watching-schema-generator'

interface GetOpts {
  schemaPath?: string
  tsconfigPath: string
  watch: boolean
  force: boolean
}
export type CompilerHooks = { onSuccess: CompilerHook; onFail: CompilerHook }

export default class TypeValidatorFactory {
  private readonly ajv = new Ajv({ verbose: true, allErrors: true })
  private readonly validators = new Map<string, TypeValidator>()

  constructor(
    private readonly logger: NcdcLogger,
    private readonly reportMetric: ReportMetric,
    private readonly compilerHooks?: CompilerHooks,
  ) {}

  public getValidator = async (opts: GetOpts): Promise<TypeValidator> => {
    if (opts.schemaPath) {
      return new TypeValidator(this.ajv, new FsSchemaLoader(opts.schemaPath))
    }

    const existingValidator = this.validators.get(opts.tsconfigPath)
    if (existingValidator) {
      return existingValidator
    }

    if (!opts.watch) {
      const tsHelpers = new TsHelpers(this.reportMetric, this.logger)
      const generator = new SchemaGenerator(
        tsHelpers.createProgram(opts.tsconfigPath, { shouldTypecheck: !opts.force }),
      )
      generator.init()
      const typeValidator = new TypeValidator(this.ajv, generator)
      this.validators.set(opts.tsconfigPath, typeValidator)
      return typeValidator
    }

    const watchingGenerator = new WatchingSchemaGenerator(
      opts.tsconfigPath,
      new TsHelpers(this.reportMetric, this.logger),
      this.logger,
      this.reportMetric,
    )

    if (this.compilerHooks) {
      watchingGenerator.subscribeToWatchStatus(this.compilerHooks.onSuccess, this.compilerHooks.onFail)
    }

    await watchingGenerator.init()
    const typeValidator = new TypeValidator(this.ajv, watchingGenerator)
    this.validators.set(opts.tsconfigPath, typeValidator)
    return typeValidator
  }
}
