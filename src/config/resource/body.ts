import qs from 'qs'

const isObject = (x: unknown): x is object => typeof x === 'object' && !!x

export class Body {
  private readonly isFormEncodedData = this.contentType?.includes('application/x-www-form-urlencoded')

  constructor(private readonly data: Data, private readonly contentType?: string) {}

  public serialize = (): string => {
    if (!isObject(this.data)) return this.data?.toString()

    return this.isFormEncodedData ? qs.stringify(this.data) : JSON.stringify(this.data)
  }

  public matches = (bodyToCompare: unknown): boolean => {
    if (this.isFormEncodedData) {
      const body = isObject(this.data) ? this.data : qs.parse(this.data)
      return this.isDeeplyEqual(body, bodyToCompare)
    }

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
