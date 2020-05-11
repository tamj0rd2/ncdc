import { runTestCommand, REAL_SERVER_HOST, RealServerBuilder, TestConfigWrapper } from './test-wrapper'
import { ConfigBuilder } from './config-helpers'
import { Server } from 'http'

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

    const result = await runTestCommand()

    expect(result.success).toBeTruthy()
    expect(result.output).toContain(`info: PASSED: Shorts - ${REAL_SERVER_HOST}/api/resource`)
  })

  it('can test endpoints that return json', async () => {
    realServer = new RealServerBuilder().withGetEndpoint('/api/resource', 200, { hello: 'world' }).start()
    const wrapper = new TestConfigWrapper()
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
      .addSchemaFile('Hello', { hello: 'string' })

    const result = await runTestCommand(`--schemaPath ${wrapper.JSON_SCHEMAS_FOLDER}`)

    expect(result.success).toBeTruthy()
    expect(result.output).toContain(`info: PASSED: Hello - ${REAL_SERVER_HOST}/api/resource`)
  })

  it('gives back a useful message when a configured body does not match the real response', async () => {
    realServer = new RealServerBuilder().withGetEndpoint('/api/resource', 200, { hello: 123 }).start()
    const wrapper = new TestConfigWrapper()
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
      .addSchemaFile('Hello', { hello: 'string' })

    const result = await runTestCommand(`--schemaPath ${wrapper.JSON_SCHEMAS_FOLDER}`)

    expect(result.success).toBeFalsy()
    expect(result.output).toContain('FAILED: Hello - http://localhost:5000/api/resource')
    expect(result.output).toContain('The response body was not deeply equal to your configured fixture')
  })

  it('gives back a useful error message', async () => {
    realServer = new RealServerBuilder().withGetEndpoint('/api/resource', 200, { hello: 123 }).start()
    const wrapper = new TestConfigWrapper().addConfig(
      new ConfigBuilder()
        .withName('Hello')
        .withEndpoints('/api/resource')
        .withServeBody(undefined)
        .withBody({ hello: 'world' })
        .withResponseType('Hello')
        .withResponseHeaders({ 'content-type': 'application/json' })
        .build(),
    )

    const result = await runTestCommand(`--schemaPath ${wrapper.JSON_SCHEMAS_FOLDER}`)

    expect(result.success).toBeFalsy()
    expect(result.output).toContain('Hello')
    expect(result.output).toContain('An error occurred while validating one of your configured fixtures')
    expect(result.output).toContain('ENOENT: no such file or directory')
    expect(result.output).toContain('json-schemas/Hello.json')
  })
})
