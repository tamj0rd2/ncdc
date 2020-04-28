import { runTestCommand } from './test-wrapper'

jest.useRealTimers()
jest.setTimeout(45000)

describe.skip('ncdc test', () => {
  it('can run the test command', async () => {
    const output = await runTestCommand()

    expect(output).toEqual('eat my shorts!')
  })
})
