import { AxiosInstance } from 'axios'
import { TestConfig } from '../config'
import TypeValidator from '../validation/type-validator'
import { doItAll, ValidationFlags, TestFn } from '../validation/validators'
import { createClient } from '../http-client'

export default class CDCTester {
  public test: TestFn<TestConfig>

  constructor(loader: AxiosInstance, typeValidator: TypeValidator) {
    this.test = doItAll(typeValidator, createClient(loader), ValidationFlags.All)
  }
}
