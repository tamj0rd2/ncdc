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
    const received = receivedHeaders[key]
    const badResult = { success: false }

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

  return { success: true }
}
