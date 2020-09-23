/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>
}

export const mockObj = <T>(thing: Partial<T>): jest.Mocked<T> => thing as jest.Mocked<T>

export const mockCtor = (target: jest.Constructable) => target as jest.MockedClass<typeof target>

export const mocked = <T extends (...args: any[]) => ReturnType<T>>(fn: T) => fn as jest.MockedFunction<T>

type MockExtensions<T extends (...args: any[]) => ReturnType<T>> = {
  mockReturnValueTimes(value: ReturnType<T>, times: number): MockFn<T>
  mockResolvedValueTimes(value: jest.ResolvedValue<ReturnType<T>>, times: number): MockFn<T>
}

type MockFn<T extends (...args: any[]) => ReturnType<T>> = (
  | jest.Mock<ReturnType<T>, Parameters<T>>
  | jest.MockedFunction<T>
) &
  MockExtensions<T>

export function mockFn<T extends (...args: any[]) => ReturnType<T>>(): jest.Mock<
  ReturnType<T>,
  Parameters<T>
> &
  MockExtensions<T>
export function mockFn<T extends (...args: any[]) => ReturnType<T>>(
  fn: T,
): jest.MockedFunction<T> & MockExtensions<T>
export function mockFn<T extends (...args: any[]) => ReturnType<T>>(fn?: T): MockFn<T> {
  const mockedFn = fn ? (fn as jest.MockedFunction<T>) : jest.fn<ReturnType<T>, Parameters<T>>()
  // @ts-expect-error no idea hot to fix properly
  mockedFn.mockReturnValueTimes = (value: ReturnType<T>, times: number) => {
    for (let i = 0; i < times; i++) {
      mockedFn.mockReturnValueOnce(value)
    }
    return mockedFn
  }

  // @ts-expect-error no idea hot to fix properly
  mockedFn.mockResolvedValueTimes = (value: jest.ResolvedValue<ReturnType<T>>, times: number) => {
    for (let i = 0; i < times; i++) {
      mockedFn.mockResolvedValueOnce(value)
    }
    return mockedFn
  }

  // @ts-expect-error no idea hot to fix properly
  return mockedFn
}

export function randomString(prefix = '', suffix = ''): string {
  return `${prefix}-${Math.random().toString(36).substring(7)}${suffix}`
}

export function randomNumber(min = 0, max = 1000): number {
  return Math.floor(Math.random() * (max - min) + min)
}

export const serialiseAsJson = <T extends object>(data: T): T => JSON.parse(JSON.stringify(data))
