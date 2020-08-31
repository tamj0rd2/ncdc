import { IncomingHttpHeaders } from 'http'

export class NcdcHeaders {
  private readonly headers: Record<string, string>

  constructor(headers?: Record<string, string>) {
    this.headers = headers ?? {}
  }

  public getAll = (): Record<string, string> => {
    return this.headers
  }

  public get = (header: string): string => {
    return this.headers[header]
  }

  public matches = (headersToCompare: IncomingHttpHeaders): boolean => {
    const expectedHeaders: Record<string, string> = {}
    for (const key in this.headers) {
      expectedHeaders[key.toLowerCase()] = this.headers[key]
    }

    const receivedHeaders: IncomingHttpHeaders = {}
    for (const key in headersToCompare) {
      receivedHeaders[key.toLowerCase()] = headersToCompare[key]
    }

    for (const key in expectedHeaders) {
      const expected = expectedHeaders[key]
      const received = receivedHeaders[key]
      const badResult = false

      if (expected.includes(',')) {
        if (!Array.isArray(received)) return badResult

        for (const item of expected.split(',')) {
          if (!received.includes(item)) return badResult
        }

        break
      }

      if (Array.isArray(received)) {
        if (!received?.includes(expected)) return badResult
      } else {
        if (received !== expected) return badResult
      }
    }

    return true
  }
}
