import { generate } from './generate'
import { test } from './test'
import { serve } from './serve'
import { Service } from './types'

export * from './serve'
export * from './generate'
export * from './test'
export * from './types'

export class NCDC {
  constructor(private readonly services: Record<string, Service>) {}

  public generate = generate.bind(null, this.services)
  public serve = serve.bind(null, this.services)
  public test = test.bind(null, this.services)
}
