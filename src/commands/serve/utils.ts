// TODO: finish up by adding tests
export const isQueryMismatch = (
  key: string,
  expectedValue: string | string[],
  actualValue: string | string[],
): void | string => {
  if (expectedValue !== undefined && actualValue === undefined) return `Expected param '${key}' with a value`

  if (Array.isArray(expectedValue)) {
    if (Array.isArray(actualValue)) {
      const missingParam = expectedValue.find(v => !actualValue.includes(v))
      if (missingParam) return `Missing '${key}=${missingParam}' from query string`
    } else {
      // TODO: update this so that if 1 param is actually given correctly, the message doesn't say it's missing
      const missingParams = expectedValue.map(v => `${key}=${v}`)
      return `Missing '${missingParams.join('&')}' from query string`
    }
  } else {
    if (Array.isArray(actualValue)) {
      if (actualValue.indexOf(expectedValue) === -1)
        return `Missing '${key}=${expectedValue}' from query string`
    } else {
      if (actualValue !== expectedValue) return `Expected '${key}' to have value '${expectedValue}'`
    }
  }
}
