import { runGenerateCommand } from '~shared/generate-wrapper'
import { runTestCommand, REAL_SERVER_HOST, RealServerBuilder } from '~shared/test-wrapper'
import { ConfigWrapper } from '~shared/config-wrapper'
import { ConfigBuilder } from '~shared/config-builder'
import stripAnsi from 'strip-ansi'
import { Server } from 'http'
import { fetch, CleanupTask, prepareServe } from '~shared/serve-wrapper'

jest.setTimeout(10000)

describe('Generate command', () => {
  it('works', async () => {
    new ConfigWrapper()
      .addConfig(
        new ConfigBuilder()
          .withName('Shorts')
          .withEndpoints('/api/resource')
          .withResponseType('RTypeDelta')
          .withResponseHeaders({ 'content-type': 'text/plain' })
          .build(),
      )
      .addType('RTypeDelta', { greeting: 'string' })

    const output = await runGenerateCommand()

    expect(stripAnsi(output)).toContain(`JSON schemas have been written to disk`)
  })
})

describe('Test command', () => {
  let realServer: Server

  afterEach((done) => {
    realServer.close((err) => {
      if (err) throw err
      done()
    })
  })

  it('works', async () => {
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
})

describe('Serve command', () => {
  const cleanupTasks: CleanupTask[] = []

  afterEach(() => {
    while (cleanupTasks.length) {
      const task = cleanupTasks.shift()
      task && task()
    }
  })

  it('works', async () => {
    new ConfigWrapper().addConfig()

    const { waitForOutput } = await prepareServe(cleanupTasks)()
    await waitForOutput(`Endpoints are being served`)

    await expect(fetch('/api/books/hooray')).resolves.toMatchObject({ status: 200 })
  })

  it('also works in watch mode', async () => {
    new ConfigWrapper().addConfig(new ConfigBuilder().withResponseType('Book').build()).addType('Book', {
      ISBN: 'string',
      ISBN_13: 'string',
      author: 'string',
      title: 'string',
    })

    await prepareServe(cleanupTasks, 10)('--watch')

    await expect(fetch('/api/books/hello')).resolves.toMatchObject({ status: 200 })
  })
})
