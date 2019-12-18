import { mockObj as mockObjOrig } from './test-helpers'
import { mockFn as mockFnOrig } from './test-helpers'

declare global {
  let mockObj: typeof mockObjOrig
  let mockFn: typeof mockFnOrig

  namespace NodeJS {
    interface Global {
      mockObj: typeof mockObjOrig
      mockFn: typeof mockFn
    }
  }
}

export {}
