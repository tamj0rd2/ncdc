import { Service } from './types'

export function test(services: Service[], testConfig: TestConfig): Promise<TestResults> {
  throw new Error('Not yet implemented')
}

export interface TestResults {}

export interface TestConfig {}
