import { runTestCommand, REAL_SERVER_HOST, RealServerBuilder } from '~shared/test-wrapper'
import { Server } from 'http'
import { ConfigWrapper, JSON_SCHEMAS_FOLDER } from '~shared/config-wrapper'
import { ConfigBuilder } from '~shared/config-builder'

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
    new ConfigWrapper().addConfig(
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

  it('does not break when using a rate limit', async () => {
    realServer = new RealServerBuilder().withGetEndpoint('/api/resource', 200, 'eat my shorts!').start()
    new ConfigWrapper().addConfig(
      new ConfigBuilder()
        .withName('Shorts')
        .withEndpoints('/api/resource')
        .withResponseHeaders({ 'content-type': 'text/plain' })
        .build(),
    )

    const result = await runTestCommand('--rateLimit 100')

    expect(result.success).toBeTruthy()
    expect(result.output).toContain(`info: PASSED: Shorts - ${REAL_SERVER_HOST}/api/resource`)
  })

  it('passes even if a request or response has additional properties', async () => {
    realServer = new RealServerBuilder()
      .withPostEndpoint('/api/resource', 200, { joy: 'to', the: 'world' })
      .start()
    new ConfigWrapper()
      .addConfig(
        new ConfigBuilder()
          .withName('lel')
          .withMethod('POST')
          .withEndpoints('/api/resource')
          .withRequestHeaders({ 'content-type': 'application/json', accept: 'application/json' })
          .withRequestType('MyRequest')
          .withRequestBody({ hello: 'world', whats: 'up?' })
          .withResponseType('MyResponse')
          .build(),
      )
      .addType('MyRequest', { hello: 'string' })
      .addType('MyResponse', { joy: 'string' })

    const result = await runTestCommand()

    expect(result).toEqual({
      success: true,
      output: expect.stringContaining(`info: PASSED: lel - ${REAL_SERVER_HOST}/api/resource`),
    })
  })

  it('can test endpoints that return json', async () => {
    realServer = new RealServerBuilder().withGetEndpoint('/api/resource', 200, { hello: 'world' }).start()
    new ConfigWrapper()
      .addConfig(
        new ConfigBuilder()
          .withName('Hello')
          .withEndpoints('/api/resource')
          .withServeBody(undefined)
          .withResponseBody({ hello: 'world' })
          .withResponseType('Hello')
          .withResponseHeaders({ 'content-type': 'application/json' })
          .build(),
      )
      .addSchemaFile('Hello', {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: {
            type: 'string',
          },
        },
      })

    const result = await runTestCommand(`--schemaPath ${JSON_SCHEMAS_FOLDER}`)

    expect(result.success).toBeTruthy()
    expect(result.output).toContain(`info: PASSED: Hello - ${REAL_SERVER_HOST}/api/resource`)
  })

  it('gives back a useful message when a configured body does not match the real response', async () => {
    realServer = new RealServerBuilder().withGetEndpoint('/api/resource', 200, { hello: 123 }).start()
    new ConfigWrapper()
      .addConfig(
        new ConfigBuilder()
          .withName('Hello')
          .withEndpoints('/api/resource')
          .withServeBody(undefined)
          .withResponseBody({ hello: 'world' })
          .withResponseType('Hello')
          .withResponseHeaders({ 'content-type': 'application/json' })
          .build(),
      )
      .addSchemaFile('Hello', { type: 'object' })

    const result = await runTestCommand(`--schemaPath ${JSON_SCHEMAS_FOLDER}`)

    expect(result.success).toBeFalsy()
    expect(result.output).toContain('FAILED: Hello - http://localhost:5000/api/resource')
    expect(result.output).toContain('The response body was not deeply equal to your configured fixture')
  })

  it('gives back a useful error message when a type does not exist on the FS', async () => {
    realServer = new RealServerBuilder().withGetEndpoint('/api/resource', 200, { hello: 123 }).start()
    new ConfigWrapper().addConfig(
      new ConfigBuilder()
        .withName('Hello')
        .withEndpoints('/api/resource')
        .withServeBody(undefined)
        .withResponseBody({ hello: 'world' })
        .withResponseType('Hello')
        .withResponseHeaders({ 'content-type': 'application/json' })
        .build(),
    )

    const result = await runTestCommand(`--schemaPath ${JSON_SCHEMAS_FOLDER}`)

    expect(result.success).toBeFalsy()
    expect(result.output).toContain('Hello')
    expect(result.output).toContain('An error occurred while validating one of your configured fixtures')
    expect(result.output).toContain('ENOENT: no such file or directory')
    expect(result.output).toContain('json-schemas/Hello.json')
  })
})
