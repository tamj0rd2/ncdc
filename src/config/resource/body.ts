const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && !!x

export class Body {
  private readonly isObject = isObject(this.data)

  constructor(private readonly data: Data) {}

  public serialize = (): string => {
    return this.isObject ? JSON.stringify(this.data) : this.data?.toString()
  }

  public matches = (bodyToCompare: unknown): boolean => {
    return this.isDeeplyEqual(this.data, bodyToCompare)
  }

  public get = (): Data => {
    return this.data
  }

  public toString = (): string => {
    const shortenedBody = this.data?.toString().substr(0, 30)
    return `${shortenedBody}${shortenedBody && shortenedBody.length >= 30 ? '...' : ''}`
  }

  private isDeeplyEqual = (expected: unknown, actual: unknown): boolean => {
    if (isObject(expected)) {
      if (!isObject(actual)) return false

      for (const key in expected) {
        const expectedValue = expected[key as keyof typeof expected]
        const actualValue = actual[key as keyof typeof actual]
        if (!this.isDeeplyEqual(expectedValue, actualValue)) return false
      }

      return true
    }

    return expected === actual
  }
}
