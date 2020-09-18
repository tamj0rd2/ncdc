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
    error: unknown,
    expectedMessage: string,
    opts: ToThrowColouredErrorOpts = { allowSubstringMatches: false },
  ) {
    if (!(error instanceof Error)) {
      return {
        message: () =>
          `Expected the received value to be an error instance\nReceived value: ${this.utils.printReceived(
            error,
          )}`,
        pass: false,
      }
    }

    const actualMessage = strip(error.message)

    if (opts.allowSubstringMatches) {
      return {
        message: () =>
          this.utils.printDiffOrStringify(
            expectedMessage,
            actualMessage,
            'Expected substring',
            'Received message',
            this.expand,
          ),
        pass: actualMessage.includes(expectedMessage),
      }
    }

    return {
      message: () =>
        this.utils.printDiffOrStringify(
          expectedMessage,
          actualMessage,
          'Expected message',
          'Received message',
          this.expand,
        ),
      pass: this.equals(expectedMessage, actualMessage),
    }
  },
})
