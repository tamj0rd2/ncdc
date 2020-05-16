import { IncomingHttpHeaders } from 'http2'

export type HeaderValidationResult =
  | {
      success: true
    }
  | {
      success: false
    }

export const areHeadersValid = (
  origExpectedHeaders: NcdcHeaders,
  origReceivedHeaders: IncomingHttpHeaders,
): HeaderValidationResult => {
  const expectedHeaders: NcdcHeaders = {}
  for (const key in origExpectedHeaders) {
    expectedHeaders[key.toLowerCase()] = origExpectedHeaders[key]
  }

  const receivedHeaders: IncomingHttpHeaders = {}
  for (const key in origReceivedHeaders) {
    receivedHeaders[key.toLowerCase()] = origReceivedHeaders[key]
  }

  for (const key in expectedHeaders) {
    const expected = expectedHeaders[key]
    const actual = receivedHeaders[key]
    const badResult = { success: false }

    if (expected.includes(',')) {
      if (!Array.isArray(actual)) return badResult
      for (const item of expected.split(',')) {
        if (!actual.includes(item)) return badResult
      }
      break
    }

    if (Array.isArray(receivedHeaders)) {
      if (!actual?.includes(expected)) return badResult
    } else {
      if (actual !== expected) return badResult
    }
  }

  return { success: true }
}
