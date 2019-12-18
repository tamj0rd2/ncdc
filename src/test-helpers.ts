export const mockObj = <T>(thing: Partial<T>): jest.Mocked<T> => thing as jest.Mocked<T>
global.mockObj = mockObj

export const mockFn = <T extends (...args: any[]) => ReturnType<T>>(): jest.Mock<
  ReturnType<T>,
  Parameters<T>
> => jest.fn<ReturnType<T>, Parameters<T>>()
global.mockFn = mockFn
