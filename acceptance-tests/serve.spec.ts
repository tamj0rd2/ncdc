import {
  fetch,
  SERVE_HOST,
  MESSAGE_RESTARTING,
  ServeResult,
  MESSAGE_RSTARTING_FAILURE as MESSAGE_RESTARTING_FAILURE,
  CONFIG_FILE,
  FIXTURE_FOLDER,
} from './serve-wrapper'
import { CleanupTask, prepareServe } from './serve-wrapper'
import { ConfigBuilder, ConfigWrapper } from './config-helpers'
import { appendFileSync } from 'fs'

jest.useRealTimers()
jest.setTimeout(13000)

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
    await waitForOutput(`Endpoints are being served on ${SERVE_HOST}`)
    expect(res.status).toBe(200)
  })

  it('serves an endpoint from a fixture file', async () => {
    // arrange
    new ServeConfigWrapper()
      .addConfig(new ConfigBuilder().withServeBody(undefined).withServeBodyPath('response').build())
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
      new ConfigBuilder().withServeBody(undefined).withServeBodyPath('my-fixture').build(),
    )

    // act
    const { waitForOutput } = await serve('', false)

    // assert
    await waitForOutput('no such file or directory')
    await expect(fetch('/')).rejects.toThrowError()
  })

  it('can serve a type checked config', async () => {
    new ServeConfigWrapper()
      .addConfig(new ConfigBuilder().withResponseType('Book').build())
      .addType('Book', { author: 'string' })

    const { waitUntilAvailable } = await prepareServe(cleanupTasks, 10)()

    await waitUntilAvailable()
    await expect(fetch('/api/books/123')).resolves.toMatchObject({ status: 200 })
  })

  describe('watching config.yml', () => {
    const watchingConfigCleanupTasks: CleanupTask[] = []
    let serve: ServeResult
    let configWrapper: ServeConfigWrapper

    afterAll(() => {
      watchingConfigCleanupTasks.forEach((task) => task())
    })

    it('restarts when config.yml is changed', async () => {
      configWrapper = new ServeConfigWrapper().addConfig(new ConfigBuilder().withServeOnly(true).build())
      serve = await prepareServe(watchingConfigCleanupTasks)('--watch')
      const resInitial = await fetch('/api/books/789')
      expect(resInitial.status).toBe(200)

      configWrapper.editConfig('Books', (c) => ({ ...c, response: { ...c.response, code: 234 } }))
      await serve.waitForOutput(MESSAGE_RESTARTING)
      await serve.waitUntilAvailable()

      await expect(fetch('/api/books/789')).resolves.toMatchObject({ status: 234 })
    })

    it('logs a message and kills the server when the config file has problems', async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      configWrapper.editConfig('Books', (c) => ({ ...c, request: {} }))

      await serve.waitForOutput(MESSAGE_RESTARTING_FAILURE)
      await serve.waitForOutput('Your config file is invalid')
    })

    it('can recover from the config file having problems', async () => {
      configWrapper.editConfig('Books', (c) => ({
        ...c,
        request: { serveEndpoint: '/api/books/*', method: 'GET' },
      }))

      await serve.waitForOutput(MESSAGE_RESTARTING)
      await serve.waitUntilAvailable()
      await expect(fetch('/api/books/789')).resolves.toMatchObject({ status: 234 })
    })

    it('logs a message and kills the server when config.yml has been deleted', async () => {
      configWrapper.deleteYaml()

      await serve.waitForOutput(MESSAGE_RESTARTING_FAILURE)
      await serve.waitForOutput(/no such file or directory.*config\.yml/)
    })

    it('can recover from config.yml being deleted when file is re-added', async () => {
      configWrapper.addConfig(new ConfigBuilder().withName('Books').withCode(401).build())

      await serve.waitUntilAvailable()
      await expect(fetch('/api/books/789')).resolves.toMatchObject({ status: 401 })
    })
  })

  describe('watching fixture files', () => {
    const fixtureFileCleanupTasks: CleanupTask[] = []
    let serve: ServeResult
    let configWrapper: ServeConfigWrapper
    const fixtureName = 'MyFixture'

    afterAll(() => {
      fixtureFileCleanupTasks.forEach((task) => task())
    })

    it('restarts the server when a fixture file changes', async () => {
      configWrapper = new ServeConfigWrapper()
        .addConfig(new ConfigBuilder().withServeBody(undefined).withServeBodyPath(fixtureName).build())
        .addFixture(fixtureName, {
          title: 'nice meme lol',
          ISBN: 'asdf',
          ISBN_13: 'asdf',
          author: 'me',
        })

      serve = await prepareServe(fixtureFileCleanupTasks)('--watch')
      configWrapper.editFixture(fixtureName, (f) => ({ ...f, title: 'shit meme' }))

      await serve.waitForOutput(/change event detected for .*MyFixture.json/)
      await serve.waitForOutput(MESSAGE_RESTARTING)
      await serve.waitUntilAvailable()

      const res = await fetch('/api/books/memes')
      await expect(res.json()).resolves.toMatchObject({ title: 'shit meme' })
    })

    it('logs and error and kills the server when a fixture file has problems', async () => {
      appendFileSync(`${FIXTURE_FOLDER}/responses/${fixtureName}.json`, 'break it all')

      await serve.waitForOutput(MESSAGE_RESTARTING_FAILURE)
      await serve.waitForOutput('Unexpected token b')
    })

    it('can recover from a bad fixture file', async () => {
      configWrapper.editFixture(fixtureName, (f) => ({ ...f, title: 'cool bean' }))

      await serve.waitForOutput(MESSAGE_RESTARTING)
      await serve.waitUntilAvailable()

      const res = await fetch('/api/books/memes')
      await expect(res.json()).resolves.toMatchObject({ title: 'cool bean' })
    })

    it('handles deletion of fixture file', async () => {
      // arrange
      configWrapper.deleteFixture(fixtureName)

      // assert
      await serve.waitForOutput(MESSAGE_RESTARTING_FAILURE)
      await serve.waitForOutput(/no such file or directory.*MyFixture\.json/)
    })

    it('can recover from fixture file deletion', async () => {
      configWrapper.addFixture(fixtureName, {
        ISBN: '123',
      })
      await serve.waitForOutput(MESSAGE_RESTARTING)
      await serve.waitUntilAvailable()

      // assert
      const res = await fetch('/api/books/29847234')
      await expect(res.json()).resolves.toMatchObject({ ISBN: '123' })
    })
  })

  it('handles switching from a fixture file to an inline body', async () => {
    const configWrapper = new ServeConfigWrapper()
      .addConfig(
        new ConfigBuilder().withName('config').withServeBody(undefined).withServeBodyPath('fixture').build(),
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
    describe('with schema loading from json files', () => {
      const typecheckingCleanup: CleanupTask[] = []
      let serve: ServeResult
      let configWrapper: ServeConfigWrapper
      const schemaName = 'Book'

      afterAll(() => {
        typecheckingCleanup.forEach((task) => task())
      })

      it('serves when the type matches the body', async () => {
        configWrapper = new ServeConfigWrapper()
          .addConfig(new ConfigBuilder().withResponseType(schemaName).withBody('Hello!').build())
          .addSchemaFile(schemaName, { type: 'string' })

        serve = await prepareServe(typecheckingCleanup)(
          `--watch --schemaPath ${configWrapper.JSON_SCHEMAS_FOLDER}`,
        )

        const res = await fetch('/api/books/123')
        expect(res.status).toBe(200)
        await expect(res.text()).resolves.toBe('Hello!')
      })

      it('restarts when the json schema changes', async () => {
        configWrapper.editSchemaFile(schemaName, { type: 'number' })
        await serve.waitForOutput(MESSAGE_RESTARTING_FAILURE)
      })

      it('can recover if the json schema matches the body again', async () => {
        configWrapper.editSchemaFile(schemaName, { type: 'string' })
        await serve.waitForOutput(MESSAGE_RESTARTING)
        await serve.waitUntilAvailable()

        const res = await fetch('/api/books/123')
        expect(res.status).toBe(200)
        await expect(res.text()).resolves.toBe('Hello!')
      })
    })

    describe('with schema generation', () => {
      const typecheckingCleanup: CleanupTask[] = []
      let serve: ServeResult
      let configWrapper: ServeConfigWrapper

      afterAll(() => {
        typecheckingCleanup.forEach((task) => task())
      })

      it('it serves when the type matches the body', async () => {
        configWrapper = new ServeConfigWrapper()
          .addConfig(new ConfigBuilder().withResponseType('Book').build())
          .addType('Book', {
            ISBN: 'string',
            ISBN_13: 'string',
            author: 'string',
            title: 'string',
          })

        serve = await prepareServe(typecheckingCleanup, 8)('--watch')

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
        await serve.waitForOutput(MESSAGE_RESTARTING_FAILURE)
        await serve.waitForOutput('Config Books response body failed type validation')
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

      it('stops the server if a source file changes that puts the type and response out of sync', async () => {
        configWrapper.editType('Book', (t) => ({ ...t, ISBN: 'number' }))

        await serve.waitForOutput(MESSAGE_RESTARTING_FAILURE)
        await serve.waitForOutput('<root>.ISBN should be number but got string')
      })

      it('can recover when a source file changes that fixes a type and response being out of sync', async () => {
        configWrapper.editType('Book', (t) => ({ ...t, ISBN: 'string' }))

        await serve.waitForOutput(MESSAGE_RESTARTING)
        await serve.waitUntilAvailable()
        await expect(fetch('/api/books/asdf')).resolves.toMatchObject({ status: 200 })
      })

      it('stops the server if a source file changes that breaks typescript compilation', async () => {
        configWrapper.editType('Book', (t) => ({ ...t, ISBN: 'what on earth?!' }))

        await serve.waitForOutput(
          'Your source code has compilation errors. Fix them to resume serving endpoints',
        )
      })

      it('can recover from the typescript compilation being broken', async () => {
        configWrapper.editType('Book', (t) => ({ ...t, ISBN: 'string' }))

        await serve.waitForOutput(MESSAGE_RESTARTING)
        await serve.waitUntilAvailable()
        await expect(fetch('/api/books/asdf')).resolves.toMatchObject({ status: 200 })
      })

      it('gives a useful message when an error is thrown during body/type validation', async () => {
        configWrapper.deleteType('Book')

        await serve.waitForOutput('An error occurred while validating one of your configured fixtures:')
        await serve.waitForOutput('type Book not found')
      })
    })
  })
})
