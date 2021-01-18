import { Services } from './types'

export function test(services: Services): Promise<TestResults> {
  throw new Error('Not yet implemented')
}

export interface TestResults {}
