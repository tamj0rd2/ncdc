export const isDeeplyEqual = (expected: unknown, actual: unknown): boolean => {
  if (typeof expected === 'object') {
    if (!expected) return expected === actual
    if (typeof actual !== 'object') return false
    if (!actual) return false

    for (const key in expected) {
      const expectedValue = expected[key as keyof typeof expected]
      const actualValue = actual[key as keyof typeof actual]
      if (!isDeeplyEqual(expectedValue, actualValue)) return false
    }

    return true
  }

  return expected === actual
}
