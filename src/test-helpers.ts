/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
export const mockObj = <T>(thing: Partial<T>): jest.Mocked<T> => thing as jest.Mocked<T>

export const mockCtor = (target: jest.Constructable) => target as jest.MockedClass<typeof target>

export const mockFn = <T extends (...args: any[]) => ReturnType<T>>(): jest.Mock<
  ReturnType<T>,
  Parameters<T>
> => jest.fn<ReturnType<T>, Parameters<T>>()
