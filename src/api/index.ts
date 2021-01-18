import { generate, GenerateConfig, GenerateResults } from './generate'
import { test, TestConfig, TestResults } from './test'
import { serve, ServeConfig, ServeResult } from './serve'
import { Service, ServiceInput, UseCase } from './types'

export * from './serve'
export * from './generate'
export * from './test'
export * from './types'

export class NCDC {
  constructor(private readonly rawServices: ServiceInput[]) {}

  public generate = (config: GenerateConfig): Promise<GenerateResults> =>
    generate(
      this.rawServices.map((s) => new Service(s, UseCase.Generating)),
      config,
    )

  public serve = (config: ServeConfig): Promise<ServeResult> =>
    serve(
      this.rawServices.map((s) => new Service(s, UseCase.Serving)),
      config,
    )

  public test = (config: TestConfig): Promise<TestResults> =>
    test(
      this.rawServices.map((s) => new Service(s, UseCase.Testing)),
      config,
    )
}
