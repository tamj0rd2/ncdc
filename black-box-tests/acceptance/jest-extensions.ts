import strip from 'strip-ansi'
import { toMatchSnapshot } from 'jest-snapshot'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toMatchStrippedSnapshot(): R
    }
  }
}

expect.extend({
  toMatchStrippedSnapshot(received) {
    const content = strip(received)
      .split('\n')
      .map((line) => {
        const filePathRegex = /\/(?:.*\/)+test-environment/i
        return line.replace(filePathRegex, '/test-environment')
      })
      .join('\n')

    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore do not know how to fix this "this" type mismatch
    return toMatchSnapshot.call(this, content, 'toMatchStrippedSnapshot')
  },
})
