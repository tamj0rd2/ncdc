import { isDeeplyEqual } from '~util'

export class Body {
  private readonly isObject = typeof this.data === 'object'

  constructor(private readonly data: Data) {}

  public serialize(): string {
    return this.isObject ? JSON.stringify(this.data) : this.data?.toString()
  }

  public matches(bodyToCompare: unknown): boolean {
    return isDeeplyEqual(this.data, bodyToCompare)
  }

  public get(): Data {
    return this.data
  }

  public toString(): string {
    const shortenedBody = this.data?.toString().substr(0, 30)
    return `${shortenedBody}${shortenedBody && shortenedBody.length >= 30 ? '...' : ''}`
  }
}
