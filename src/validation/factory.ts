import TypeValidator from './type-validator'
import { FsSchemaLoader, SchemaGenerator, WatchingSchemaGenerator, TsHelpers } from '~schema'
import Ajv from 'ajv'
import { NcdcLogger } from '~logger'
import { ReportMetric } from '~commands/shared'
import { CompilerHook } from '~schema/watching-schema-generator'

interface FactoryOptions {
  compilerHooks?: CompilerHooks
  watch?: boolean
  force?: boolean
}

interface GetOpts {
  schemaPath?: string
  tsconfigPath: string
}
export type CompilerHooks = { onSuccess: CompilerHook; onFail: CompilerHook }

export default class TypeValidatorFactory {
  private readonly ajv = new Ajv({ verbose: true, allErrors: true })
  private readonly validators = new Map<string, TypeValidator>()
  private readonly tsHelpers: TsHelpers

  constructor(
    private readonly logger: NcdcLogger,
    private readonly reportMetric: ReportMetric,
    private readonly opts: FactoryOptions = {},
  ) {
    this.tsHelpers = new TsHelpers(this.reportMetric, this.logger)
  }

  public getValidator = async (getOpts: GetOpts): Promise<TypeValidator> => {
    if (getOpts.schemaPath) {
      return new TypeValidator(this.ajv, new FsSchemaLoader(getOpts.schemaPath))
    }

    const existingValidator = this.validators.get(getOpts.tsconfigPath)
    if (existingValidator) {
      return existingValidator
    }

    if (!this.opts.watch) {
      const generator = new SchemaGenerator(
        this.tsHelpers.createProgram(getOpts.tsconfigPath, { shouldTypecheck: !this.opts.force }),
      )
      generator.init()
      const typeValidator = new TypeValidator(this.ajv, generator)
      this.validators.set(getOpts.tsconfigPath, typeValidator)
      return typeValidator
    }

    const watchingGenerator = new WatchingSchemaGenerator(
      getOpts.tsconfigPath,
      this.tsHelpers,
      this.logger,
      this.reportMetric,
    )

    if (this.opts.compilerHooks) {
      watchingGenerator.subscribeToWatchStatus(
        this.opts.compilerHooks.onSuccess,
        this.opts.compilerHooks.onFail,
      )
    }

    await watchingGenerator.init()
    const typeValidator = new TypeValidator(this.ajv, watchingGenerator)
    this.validators.set(getOpts.tsconfigPath, typeValidator)
    return typeValidator
  }
}
