const isObject = (x: unknown): x is object => typeof x === 'object' && !!x

export const isDeeplyEqual = (expected: unknown, actual: unknown): boolean => {
  if (isObject(expected)) {
    if (!isObject(actual)) return false

    for (const key in expected) {
      const expectedValue = expected[key as keyof typeof expected]
      const actualValue = actual[key as keyof typeof actual]
      if (!isDeeplyEqual(expectedValue, actualValue)) return false
    }

    return true
  }

  return expected === actual
}
