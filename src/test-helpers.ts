export function mockedObj<T>(thing: Partial<T>): jest.Mocked<T> {
  return thing as jest.Mocked<T>
}
