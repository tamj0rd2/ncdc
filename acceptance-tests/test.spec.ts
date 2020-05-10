import { runTestCommand, REAL_SERVER_HOST, RealServerBuilder, TestConfigWrapper } from './test-wrapper'
import { ConfigBuilder } from './config-helpers'
import { Server } from 'http'
import strip from 'strip-ansi'

jest.useRealTimers()
jest.setTimeout(10000)

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

  it('can test endpoints that return json', async () => {
    realServer = new RealServerBuilder().withGetEndpoint('/api/resource', 200, { hello: 'world' }).start()
    new TestConfigWrapper()
      .addConfig(
        new ConfigBuilder()
          .withName('Hello')
          .withEndpoints('/api/resource')
          .withServeBody(undefined)
          .withBody({ hello: 'world' })
          .withResponseType('Hello')
          .withResponseHeaders({ 'content-type': 'application/json' })
          .build(),
      )
      .addType('Hello', { hello: 'string' })

    const output = await runTestCommand()

    expect(strip(output)).toContain(`info: PASSED: Hello - ${REAL_SERVER_HOST}/api/resource`)
  })

  it('can handle errors gracefully', async () => {
    realServer = new RealServerBuilder().withGetEndpoint('/api/resource', 200, { hello: 123 }).start()
    new TestConfigWrapper()
      .addConfig(
        new ConfigBuilder()
          .withName('Hello')
          .withEndpoints('/api/resource')
          .withServeBody(undefined)
          .withBody({ hello: 'world' })
          .withResponseType('Hello')
          .withResponseHeaders({ 'content-type': 'application/json' })
          .build(),
      )
      .addType('Hello', { hello: 'string' })

    await expect(runTestCommand()).rejects.toThrowError('FAILED: Hello')
  })
})
