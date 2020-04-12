import { fetch, SERVE_HOST } from './cli-wrapper'
import { CleanupTask, prepareServe } from './cli-wrapper'
import { ConfigBuilder, ConfigWrapper } from './config-helpers'

jest.disableAutomock()
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
    const { getOutput } = await serve()
    const res = await fetch('/api/books/hooray')
    const output = getOutput()

    // // // assert
    expect(output).toContain(`Registered ${SERVE_HOST}/api/books/* from config: Books`)
    expect(output).toContain(`Endpoints are being served on ${SERVE_HOST}`)
    expect(res.status).toBe(200)
    expect(output).not.toContain('Restarting ncdc serve')
  })

  it('restarts when config.yml is changed', async () => {
    // arrange
    const configWrapper = new ConfigWrapper().addConfig()
    const { waitForOutput, waitUntilAvailable } = await serve()
    const resInitial = await fetch('/api/books/789')
    expect(resInitial.status).toBe(200)

    // act
    configWrapper.editConfig('Books', (c) => ({ ...c, response: { ...c.response, code: 234 } }))
    await waitForOutput('Restarting ncdc serve')
    await waitUntilAvailable()
    const resPostEdit = await fetch('/api/books/789')

    // assert
    expect(resPostEdit.status).toBe(234)
  })

  it('logs a message and kills the server when config.yml has been deleted', async () => {
    // arrange
    const configWrapper = new ConfigWrapper().addConfig()
    const { getOutput, waitForOutput } = await serve()
    const resInitial = await fetch('/api/books/yay')
    expect(resInitial.status).toBe(200)

    // act
    configWrapper.deleteFile()
    await waitForOutput('Restarting ncdc serve')
    await waitForOutput('Could not start server')
    const output = getOutput()

    // assert
    expect(output).toMatch(/no such file or directory .+config\.yml/)
    await expect(fetch('/api/books/yay')).rejects.toThrowError()
  })

  // TODO: refactor these tests to use js-yaml safeDump and config builder
  it('can recover from config.yml being deleted when file is re-added', async () => {
    // arrange
    const configWrapper = new ConfigWrapper().addConfig()
    const { waitForOutput } = await serve()
    configWrapper.deleteFile()
    await waitForOutput('Could not start server')

    // act
    const newConfig = new ConfigBuilder().withName('Cooks').withCode(404).build()
    configWrapper.addConfig(newConfig)

    // assert
    await waitForOutput(`Registered ${SERVE_HOST}/api/books/* from config: Cooks`)
    const { status } = await fetch('/api/books/noice')
    expect(status).toEqual(404)
  })

  it.todo('restarts the server when a path referenced by the config file changes')

  // TODO: oooooh. This could actually have a caching folder!!! Then generate
  // would just become the default :D
  // typescript-json-schema getSourceFile could really help with this too

  it.todo('restarts when a source file containing types changes')
})
