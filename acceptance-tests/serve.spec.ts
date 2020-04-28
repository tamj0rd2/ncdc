import {
  fetch,
  SERVE_HOST,
  MESSAGE_RESTARTING,
  ServeResult,
  MESSAGE_RSTARTING_FAILURE,
  CONFIG_FILE,
  FIXTURE_FOLDER,
} from './serve-wrapper'
import { CleanupTask, prepareServe } from './serve-wrapper'
import { ConfigBuilder, ConfigWrapper } from './config-helpers'

jest.useRealTimers()
jest.setTimeout(25000)

class ServeConfigWrapper extends ConfigWrapper {
  constructor() {
    super(CONFIG_FILE, FIXTURE_FOLDER)
  }
}

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
    new ServeConfigWrapper().addConfig()

    // act
    const { waitForOutput } = await serve()
    const res = await fetch('/api/books/hooray')

    // assert
    await waitForOutput('/api/books/123 from config: Books')
    await waitForOutput(`Endpoints are being served on ${SERVE_HOST}`)
    expect(res.status).toBe(200)
  })

  it('serves an endpoint from a fixture file', async () => {
    // arrange
    new ServeConfigWrapper()
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

  it('logs an error and exists if a fixture file does not exist', async () => {
    // arrange
    new ServeConfigWrapper().addConfig(
      new ConfigBuilder().withServeBody(undefined).withFixture('my-fixture').build(),
    )

    // act
    const { waitForOutput } = await serve('', false)

    // assert
    await waitForOutput('no such file or directory')
    await expect(fetch('/')).rejects.toThrowError()
  })

  describe('watching config.yml', () => {
    it('restarts when config.yml is changed', async () => {
      // arrange
      const configWrapper = new ServeConfigWrapper().addConfig()
      const { waitForOutput, waitUntilAvailable } = await serve('--watch')
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
      const configWrapper = new ServeConfigWrapper().addConfig()
      const { waitForOutput } = await serve('--watch')
      const resInitial = await fetch('/api/books/yay')
      expect(resInitial.status).toBe(200)

      // act
      configWrapper.deleteYaml()

      // assert
      await waitForOutput(MESSAGE_RESTARTING)
      await waitForOutput(/Could not restart ncdc server.* no such file or directory/)
      await expect(fetch('/api/books/yay')).rejects.toThrowError()
    })

    it('can recover from config.yml being deleted when file is re-added', async () => {
      // arrange
      const configWrapper = new ServeConfigWrapper().addConfig()
      const { waitForOutput } = await serve('--watch')
      configWrapper.deleteYaml()
      await waitForOutput(MESSAGE_RSTARTING_FAILURE)

      // act
      const newConfig = new ConfigBuilder().withName('Cooks').withCode(404).build()
      configWrapper.addConfig(newConfig)

      // assert
      await waitForOutput(`Registered ${SERVE_HOST}/api/books/* from config: Cooks`)
      const { status } = await fetch('/api/books/noice')
      expect(status).toEqual(404)
    })

    it('restarts each time config.yml is changed', async () => {
      const initialName = 'Initial'
      const configWrapper = new ServeConfigWrapper().addConfig(
        new ConfigBuilder().withName(initialName).build(),
      )
      const { waitForOutput, waitUntilAvailable } = await serve('--watch')

      await waitForOutput(`from config: ${initialName}`)
      await waitUntilAvailable()

      const editNameAndVerify = async (previousName: string, editedName: string): Promise<void> => {
        configWrapper.editConfig(previousName, (c) => ({ ...c, name: editedName }))
        await waitForOutput(MESSAGE_RESTARTING)
        await waitForOutput(`/api/books/123 from config: ${editedName}`)
        await waitUntilAvailable()
      }

      await editNameAndVerify(initialName, 'edit_Eat')
      await editNameAndVerify('edit_Eat', 'edit_My')
      await editNameAndVerify('edit_My', 'edit_Shorts')
      await editNameAndVerify('edit_Shorts', 'edit_Please')
    })
  })

  describe('watching fixture files', () => {
    // TODO: fix
    it('restarts the server when a fixture file changes', async () => {
      // arrange
      const fixtureName = 'response'
      const configWrapper = new ServeConfigWrapper()
        .addConfig(new ConfigBuilder().withServeBody(undefined).withFixture(fixtureName).build())
        .addFixture(fixtureName, {
          title: 'nice meme lol',
          ISBN: 'asdf',
          ISBN_13: 'asdf',
          author: 'me',
        })

      // act
      const { waitForOutput, waitUntilAvailable } = await serve('--watch')
      configWrapper.editFixture(fixtureName, (f) => ({ ...f, title: 'shit meme' }))

      await waitForOutput(/change event detected for .*response.json/)
      await waitForOutput(MESSAGE_RESTARTING)
      await waitUntilAvailable()
      const res = await fetch('/api/books/memes')
      const json = await res.json()

      // assert
      expect(json.title).toBe('shit meme')
    })

    it('handles deletion of fixture file', async () => {
      // arrange
      const fixtureName = 'crazy-fixture'
      const configWrapper = new ServeConfigWrapper()
        .addConfig(new ConfigBuilder().withServeBody(undefined).withFixture(fixtureName).build())
        .addFixture(fixtureName, {
          title: 'nice meme lol',
          ISBN: 'asdf',
          ISBN_13: 'asdf',
          author: 'me',
        })

      // act
      const { waitForOutput } = await serve('--watch')
      configWrapper.deleteFixture(fixtureName)

      // assert
      await waitForOutput(/Could not restart ncdc server.* no such file or directory.*crazy-fixture\.json/)
    })

    // TODO: fix
    it('can recover from fixture file deletion', async () => {
      // arrange
      const fixtureName = 'another-fixture'
      const configWrapper = new ServeConfigWrapper()
        .addConfig(new ConfigBuilder().withServeBody(undefined).withFixture(fixtureName).build())
        .addFixture(fixtureName, {
          title: 'nice meme lol',
          ISBN: 'asdf',
          ISBN_13: 'asdf',
          author: 'me',
        })

      const { waitForOutput, waitUntilAvailable } = await serve('--watch')
      configWrapper.deleteFixture(fixtureName)
      await waitForOutput(MESSAGE_RSTARTING_FAILURE)

      // act
      configWrapper.addFixture(fixtureName, {
        ISBN: '123',
      })
      await waitForOutput(MESSAGE_RESTARTING)
      await waitUntilAvailable()

      // assert
      const res = await fetch('/api/books/29847234')
      const body = await res.json()
      expect(body.ISBN).toBe('123')
    })

    // TODO: fix
    it('restarts each time a fixture file is changed or deleted', async () => {
      const fixtureName = 'MyFixture'
      const configWrapper = new ServeConfigWrapper()
        .addConfig(new ConfigBuilder().withServeBody(undefined).withFixture(fixtureName).build())
        .addFixture(fixtureName, { title: 'Freddy' })
      const { waitForOutput, waitUntilAvailable } = await serve('--watch')

      const verifyFixture = async (title: string, withRestartMessage = true): Promise<void> => {
        if (withRestartMessage) await waitForOutput(MESSAGE_RESTARTING)
        await waitUntilAvailable()
        const res = await fetch('/api/books/abc')
        expect(res.status).toBe(200)
        await expect(res.json()).resolves.toMatchObject({ title })
      }

      await verifyFixture('Freddy', false)
      configWrapper.editFixture(fixtureName, (f) => ({ ...f, title: 'Eat' }))
      await verifyFixture('Eat')
      configWrapper.editFixture(fixtureName, (f) => ({ ...f, title: 'My' }))
      await verifyFixture('My')
      configWrapper.deleteFixture(fixtureName)
      await waitForOutput(MESSAGE_RSTARTING_FAILURE)
      configWrapper.addFixture(fixtureName, { title: 'Shorts' })
      await verifyFixture('Shorts')
      configWrapper.editFixture(fixtureName, (f) => ({ ...f, title: 'Please' }))
      await verifyFixture('Please')
    })
  })

  it('handles switching from a fixture file to an inline body', async () => {
    const configWrapper = new ServeConfigWrapper()
      .addConfig(
        new ConfigBuilder().withName('config').withServeBody(undefined).withFixture('fixture').build(),
      )
      .addFixture('fixture', { hello: 'world' })
    const { waitForOutput, waitUntilAvailable } = await serve('--watch')

    configWrapper.editConfig('config', (c) => ({
      ...c,
      response: { serveBody: 'somebody', code: c.response.code },
    }))
    await waitForOutput(MESSAGE_RESTARTING)
    await waitUntilAvailable()

    const res = await fetch('/api/books/blah')
    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('somebody')
  })

  it('handles switching from an inline body to a fixture file', async () => {
    const configWrapper = new ServeConfigWrapper().addConfig(new ConfigBuilder().withName('config').build())
    const { waitForOutput, waitUntilAvailable } = await serve('--watch')

    configWrapper
      .editConfig('config', (c) => ({
        ...c,
        response: { serveBodyPath: './responses/my-fixture.json', code: c.response.code },
      }))
      .addFixture('my-fixture', { hello: 'world' })
    await waitForOutput(MESSAGE_RESTARTING)
    await waitUntilAvailable()

    const res = await fetch('/api/books/blah')
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ hello: 'world' })
  })

  describe('type checking', () => {
    const typecheckingCleanup: CleanupTask[] = []
    let serve: ServeResult
    let configWrapper: ServeConfigWrapper

    afterAll(() => {
      typecheckingCleanup.forEach((task) => task())
    })

    it('it serves when the type matches the body', async () => {
      configWrapper = new ServeConfigWrapper()
        .addConfig(new ConfigBuilder().withType('Book').build())
        .addType('Book', {
          ISBN: 'string',
          ISBN_13: 'string',
          author: 'string',
          title: 'string',
        })

      serve = await prepareServe(typecheckingCleanup, 10)('--watch')

      await expect(fetch('/api/books/hello')).resolves.toMatchObject({ status: 200 })
    })

    it('stops the server if a body stops matching the type', async () => {
      configWrapper.editConfig('Books', (config) => ({
        ...config,
        response: {
          ...config.response,
          serveBody: {
            title: 123,
          },
        },
      }))

      await serve.waitForOutput(MESSAGE_RESTARTING)
      await serve.waitForOutput(/Could not restart ncdc server.*due to config errors/)
      await expect(fetch('/api/books/aldksj')).rejects.toThrowError()
    })

    it('can recover from incorrect body type validation', async () => {
      configWrapper.editConfig('Books', (config) => ({
        ...config,
        response: {
          ...config.response,
          serveBody: {
            ISBN: 'ISBN',
            ISBN_13: 'ISBN_13',
            author: 'author',
            title: 'title',
          },
        },
      }))

      await serve.waitForOutput(MESSAGE_RESTARTING)

      await expect(fetch('/api/books/asdf')).resolves.toMatchObject({ status: 200 })
    })

    // TODO: oooooh. NCDC could actually have a caching folder!!! Then generate
    // would just become the default because why the hell not? :D
    // typescript-json-schema getSourceFile could really help with this too
    it.todo('restarts when a source file containing types changes')
  })
})
