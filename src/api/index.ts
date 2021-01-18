import { generate, GenerateConfig, GenerateResults } from './generate'
import { test, TestConfig, TestResults } from './test'
import { serve, ServeConfig, ServeResult } from './serve'
import { GenerateService, ServeService, ServiceInput, TestService } from './types'

export * from './serve'
export * from './generate'
export * from './test'
export * from './types'

// TODO: run the type validator when this thingy starts to make sure that all bodies etc are available and correct
export class NCDC {
  constructor(private readonly rawServices: ServiceInput[]) {}

  public generate = (config: GenerateConfig): Promise<GenerateResults> =>
    generate(
      this.rawServices.map((s) => new GenerateService(s)),
      config,
    )

  public serve = (config: ServeConfig): Promise<ServeResult> =>
    serve(
      this.rawServices.map((s) => new ServeService(s)),
      config,
    )

  public test = (config: TestConfig): Promise<TestResults> =>
    test(
      this.rawServices.map((s) => new TestService(s)),
      config,
    )
}
