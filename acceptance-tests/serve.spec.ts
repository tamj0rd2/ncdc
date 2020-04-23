import { fetch, SERVE_HOST, MESSAGE_RESTARTING } from './cli-wrapper'
import { CleanupTask, prepareServe } from './cli-wrapper'
import { ConfigBuilder, ConfigWrapper } from './config-helpers'

jest.useRealTimers()
jest.setTimeout(45000)

describe('ncdc serve', () => {
  const cleanupTasks: CleanupTask[] = []
  const serve = prepareServe(cleanupTasks)

  afterEach(() => {
    while (cleanupTasks.length) {
      const task = cleanupTasks.shift()
      task && task()
    }
  })

  it('starts serving on port 4000', async () => {
    // arrange
    new ConfigWrapper().addConfig()

    // act
    const { getAllOutput: getOutput } = await serve()
    const res = await fetch('/api/books/hooray')
    const output = getOutput()

    // assert
    expect(output).toMatch(/Registered .*\/api\/books\/\* from config: Books/)
    expect(output).toContain(`Endpoints are being served on ${SERVE_HOST}`)
    expect(res.status).toBe(200)
    expect(output).not.toContain(MESSAGE_RESTARTING)
  })

  it('serves an endpoint from a fixture file', async () => {
    // arrange
    new ConfigWrapper()
      .addConfig(new ConfigBuilder().withServeBody(undefined).withFixture('response').build())
      .addFixture('response', {
        title: 'nice meme lol',
        ISBN: 'asdf',
        ISBN_13: 'asdf',
        author: 'me',
      })

    // act
    await serve()
    const res = await fetch('/api/books/cooldude')
    const json = await res.json()

    // assert
    expect(res.status).toBe(200)
    expect(json.title).toBe('nice meme lol')
  })

  it.todo('handles fixture file not existing')

  it('restarts when config.yml is changed', async () => {
    // arrange
    const configWrapper = new ConfigWrapper().addConfig()
    const { waitForOutput, waitUntilAvailable } = await serve()
    const resInitial = await fetch('/api/books/789')
    expect(resInitial.status).toBe(200)

    // act
    configWrapper.editConfig('Books', (c) => ({ ...c, response: { ...c.response, code: 234 } }))
    await waitForOutput(MESSAGE_RESTARTING)
    await waitUntilAvailable()
    const resPostEdit = await fetch('/api/books/789')

    // assert
    expect(resPostEdit.status).toBe(234)
  })

  it('logs a message and kills the server when config.yml has been deleted', async () => {
    // arrange
    const configWrapper = new ConfigWrapper().addConfig()
    const { waitForOutput } = await serve()
    const resInitial = await fetch('/api/books/yay')
    expect(resInitial.status).toBe(200)

    // act
    configWrapper.deleteYaml()

    // assert
    await waitForOutput(MESSAGE_RESTARTING)
    await waitForOutput(/Could not start server.* no such file or directory/)
    await expect(fetch('/api/books/yay')).rejects.toThrowError()
  })

  it('can recover from config.yml being deleted when file is re-added', async () => {
    // arrange
    const configWrapper = new ConfigWrapper().addConfig()
    const { waitForOutput } = await serve()
    configWrapper.deleteYaml()
    await waitForOutput('Could not start server')

    // act
    const newConfig = new ConfigBuilder().withName('Cooks').withCode(404).build()
    configWrapper.addConfig(newConfig)

    // assert
    await waitForOutput(`Registered ${SERVE_HOST}/api/books/* from config: Cooks`)
    const { status } = await fetch('/api/books/noice')
    expect(status).toEqual(404)
  })

  it('restarts the server when a fixture file changes', async () => {
    // arrange
    const fixtureName = 'response'
    const configWrapper = new ConfigWrapper()
      .addConfig(new ConfigBuilder().withServeBody(undefined).withFixture(fixtureName).build())
      .addFixture(fixtureName, {
        title: 'nice meme lol',
        ISBN: 'asdf',
        ISBN_13: 'asdf',
        author: 'me',
      })

    // act
    const { waitForOutput, waitUntilAvailable } = await serve()
    configWrapper.editFixture(fixtureName, (f) => ({ ...f, title: 'shit meme' }))

    await waitForOutput(/change event detected for .*response.json/)
    await waitForOutput(MESSAGE_RESTARTING)
    await waitUntilAvailable()
    const res = await fetch('/api/books/memes')
    const json = await res.json()

    // assert
    expect(json.title).toBe('shit meme')
  })

  it.todo('handles deletion of fixture file')

  it.todo('can recover from fixture file deletion')

  // TODO: oooooh. This could actually have a caching folder!!! Then generate
  // would just become the default because why the hell not? :D
  // typescript-json-schema getSourceFile could really help with this too

  it.todo('restarts when a source file containing types changes')
})
