import { runTestCommand, REAL_SERVER_HOST, RealServerBuilder, TestConfigWrapper } from './test-wrapper'
import { ConfigBuilder } from './config-helpers'
import { Server } from 'http'
import strip from 'strip-ansi'

jest.useRealTimers()
jest.setTimeout(45000)

describe('ncdc test', () => {
  let realServer: Server

  afterEach((done) => {
    realServer.close((err) => {
      if (err) throw err
      done()
    })
  })

  it('can run the test command', async () => {
    realServer = new RealServerBuilder().withGetEndpoint('/api/resource', 200, 'eat my shorts!').start()
    new TestConfigWrapper().addConfig(
      new ConfigBuilder()
        .withName('Shorts')
        .withEndpoints('/api/resource')
        .withResponseHeaders({ 'content-type': 'text/plain' })
        .build(),
    )

    const output = await runTestCommand()

    expect(strip(output)).toContain(`info: PASSED: Shorts - ${REAL_SERVER_HOST}/api/resource`)
  })
})
