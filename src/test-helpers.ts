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

export function mockFn<T extends (...args: any[]) => ReturnType<T>>(): jest.Mock<ReturnType<T>, Parameters<T>>
export function mockFn<T extends (...args: any[]) => ReturnType<T>>(fn: T): jest.MockedFunction<T>
export function mockFn<T extends (...args: any[]) => ReturnType<T>>(fn?: T): any {
  return fn ? (fn as jest.MockedFunction<T>) : jest.fn<ReturnType<T>, Parameters<T>>()
}

export function randomString(): string {
  return Math.random().toString(36).substring(7)
}

export function randomNumber(min = 0, max = 1000): number {
  return Math.floor(Math.random() * (max - min) + min)
}
