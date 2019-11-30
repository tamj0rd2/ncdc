declare type MockObj = <T>(thing: Partial<T>) => jest.Mocked<T>

declare global {
  let mockObj: MockObj

  namespace NodeJS {
    interface Global {
      mockObj: MockObj
    }
  }
}

export {}
