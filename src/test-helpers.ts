global.mockObj = <T>(thing: Partial<T>): jest.Mocked<T> => thing as jest.Mocked<T>
