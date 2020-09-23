import strip from 'strip-ansi'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toThrowColouredError(expectedMessage: string, opts?: ToThrowColouredErrorOpts): R
    }
  }
}

type ToThrowColouredErrorOpts = { allowSubstringMatches?: boolean }

expect.extend({
  toThrowColouredError(
    receivedValue: unknown,
    expectedMessage: string,
    { allowSubstringMatches = false }: ToThrowColouredErrorOpts = {},
  ) {
    const getMessageMatchResult = (actualMessage: string) => {
      const plainMessage = strip(actualMessage)
      return {
        message: () =>
          this.utils.printDiffOrStringify(
            expectedMessage,
            plainMessage,
            `Expected ${allowSubstringMatches ? 'substring' : 'message'}`,
            'Received message',
            this.expand,
          ),
        pass: allowSubstringMatches
          ? plainMessage.includes(expectedMessage)
          : this.equals(expectedMessage, plainMessage),
      }
    }

    const receivedValueFormatted = this.utils.printReceived(receivedValue)

    if (this.promise) {
      if (!(receivedValue instanceof Error)) {
        return {
          message: () =>
            `Expected the received value to be an error instance\nReceived value: ${receivedValueFormatted}`,
          pass: false,
        }
      }

      return getMessageMatchResult(receivedValue.message)
    }

    const func = receivedValue

    if (!(func instanceof Function)) {
      return {
        message: () =>
          `toThrowColouredError can only be called on a function or promise\nReceived value: ${receivedValueFormatted}`,
        pass: false,
      }
    }

    try {
      func()
      return {
        message: () => 'Expected the function to throw but it did not',
        pass: false,
      }
    } catch (err) {
      return getMessageMatchResult(err.message)
    }
  },
})
