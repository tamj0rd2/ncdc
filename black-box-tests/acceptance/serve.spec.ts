import { appendFileSync } from 'fs'
import { ConfigWrapper, FIXTURES_FOLDER, JSON_SCHEMAS_FOLDER } from '~shared/config-wrapper'
import { ConfigBuilder } from '~shared/config-builder'
import {
  fetch,
  CleanupTask,
  prepareServe,
  ServeResult,
  MESSAGE_RESTARTING,
  MESSAGE_RESTARTING_FAILURE,
} from '~shared/serve-wrapper'
import './jest-extensions'

jest.useRealTimers()
jest.setTimeout(13000)

describe('ncdc serve', () => {
  const cleanupTasks: CleanupTask[] = []
  const serve = prepareServe(cleanupTasks)

  afterEach(() => {
    while (cleanupTasks.length) {
      const task = cleanupTasks.shift()
      task && task()
    }
  })

  describe('basic functionality', () => {
    it('starts serving on port 4000', async () => {
      // arrange
      new ConfigWrapper().addTsconfig().addConfig()

      // act
      const { waitForOutput, getStrippedOutput } = await serve()
      await waitForOutput(`Endpoints are being served`)

      // assert
      await expect(fetch('/api/books/hooray')).resolves.toMatchObject({ status: 200 })
      expect(getStrippedOutput()).toMatchStrippedSnapshot()
    })

    it('serves an endpoint from a fixture file', async () => {
      // arrange
      new ConfigWrapper()
        .addTsconfig()
        .addConfig(new ConfigBuilder().withServeBody(undefined).withServeBodyPath('response').build())
        .addFixture('response', {
          title: 'nice meme lol',
          ISBN: 'asdf',
          ISBN_13: 'asdf',
          author: 'me',
        })

      // act
      const { getStrippedOutput } = await serve()
      const res = await fetch('/api/books/cooldude')
      const json = await res.json()

      // assert
      expect(res.status).toBe(200)
      expect(json.title).toBe('nice meme lol')
      expect(getStrippedOutput()).toMatchStrippedSnapshot()
    })

    it('logs an error and exits if a fixture file does not exist', async () => {
      // arrange
      new ConfigWrapper()
        .addTsconfig()
        .addConfig(new ConfigBuilder().withServeBody(undefined).withServeBodyPath('my-fixture').build())

      // act
      const { waitForOutput, getStrippedOutput } = await serve('', false)

      // assert
      await waitForOutput('no such file or directory')
      await expect(fetch('/')).rejects.toThrowError()
      expect(getStrippedOutput()).toMatchStrippedSnapshot()
    })

    it('can serve a type checked config', async () => {
      new ConfigWrapper()
        .addTsconfig()
        .addConfig(new ConfigBuilder().withResponseType('Book').build())
        .addType('Book', { author: 'string' })

      const { waitUntilAvailable, getStrippedOutput } = await prepareServe(cleanupTasks, 10)()

      await waitUntilAvailable()
      await expect(fetch('/api/books/123')).resolves.toMatchObject({ status: 200 })
      expect(getStrippedOutput()).toMatchStrippedSnapshot()
    })
  })

  describe('watching config.yml', () => {
    const watchingConfigCleanupTasks: CleanupTask[] = []
    let serve: ServeResult
    let configWrapper: ConfigWrapper

    afterAll(() => {
      watchingConfigCleanupTasks.forEach((task) => task())
    })

    it('restarts when config.yml is changed', async () => {
      configWrapper = new ConfigWrapper()
        .addTsconfig()
        .addConfig(new ConfigBuilder().withServeOnly(true).build())
      serve = await prepareServe(watchingConfigCleanupTasks)('--watch')
      const resInitial = await fetch('/api/books/789')
      expect(resInitial.status).toBe(200)

      configWrapper.editConfig('Books', (c) => ({ ...c, response: { ...c.response, code: 234 } }))
      await serve.waitForOutput(MESSAGE_RESTARTING)
      await serve.waitUntilAvailable()

      await expect(fetch('/api/books/789')).resolves.toMatchObject({ status: 234 })
      expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
    })

    it('logs a message and kills the server when the config file has problems', async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      configWrapper.editConfig('Books', (c) => ({ ...c, request: {} }))

      await serve.waitForOutput(MESSAGE_RESTARTING_FAILURE)
      await serve.waitForOutput(/Invalid service config file \(.*config.yml\)/)
      expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
    })

    it('can recover from the config file having problems', async () => {
      configWrapper.editConfig('Books', (c) => ({
        ...c,
        request: { serveEndpoint: '/api/books/*', method: 'GET' },
      }))

      await serve.waitForOutput(MESSAGE_RESTARTING)
      await serve.waitUntilAvailable()
      await expect(fetch('/api/books/789')).resolves.toMatchObject({ status: 234 })
      expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
    })

    it('logs a message and kills the server when config.yml has been deleted', async () => {
      configWrapper.deleteYaml()

      await serve.waitForOutput(MESSAGE_RESTARTING_FAILURE)
      await serve.waitForOutput(/no such file or directory.*config\.yml/)
      expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
    })

    it('can recover from config.yml being deleted when file is re-added', async () => {
      configWrapper.addConfig(new ConfigBuilder().withName('Books').withCode(401).build())

      await serve.waitUntilAvailable()
      await expect(fetch('/api/books/789')).resolves.toMatchObject({ status: 401 })
      expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
    })
  })

  describe('watching fixture files', () => {
    const fixtureFileCleanupTasks: CleanupTask[] = []
    let serve: ServeResult
    let configWrapper: ConfigWrapper
    const fixtureName = 'MyFixture'

    afterAll(() => {
      fixtureFileCleanupTasks.forEach((task) => task())
    })

    it('restarts the server when a fixture file changes', async () => {
      configWrapper = new ConfigWrapper()
        .addTsconfig()
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
      expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
    })

    it('logs and error and kills the server when a fixture file has problems', async () => {
      appendFileSync(`${FIXTURES_FOLDER}/${fixtureName}.json`, 'break it all')

      await serve.waitForOutput(MESSAGE_RESTARTING_FAILURE)
      await serve.waitForOutput('Unexpected token b')
      expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
    })

    it('can recover from a bad fixture file', async () => {
      configWrapper.editFixture(fixtureName, (f) => ({ ...f, title: 'cool bean' }))

      await serve.waitForOutput(MESSAGE_RESTARTING)
      await serve.waitUntilAvailable()

      const res = await fetch('/api/books/memes')
      await expect(res.json()).resolves.toMatchObject({ title: 'cool bean' })
      expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
    })

    it('handles deletion of fixture file', async () => {
      // arrange
      configWrapper.deleteFixture(fixtureName)

      // assert
      await serve.waitForOutput(MESSAGE_RESTARTING_FAILURE)
      await serve.waitForOutput(/no such file or directory.*MyFixture\.json/)
      expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
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
      expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
    })
  })

  describe('switching fixture sources in watch mode', () => {
    it('handles switching from a fixture file to an inline body', async () => {
      const configWrapper = new ConfigWrapper()
        .addTsconfig()
        .addConfig(
          new ConfigBuilder()
            .withName('config')
            .withServeBody(undefined)
            .withServeBodyPath('fixture')
            .build(),
        )
        .addFixture('fixture', { hello: 'world' })
      const { waitForOutput, waitUntilAvailable, getStrippedOutput } = await serve('--watch')

      configWrapper.editConfig('config', (c) => ({
        ...c,
        response: { serveBody: 'somebody', code: c.response.code },
      }))
      await waitForOutput(MESSAGE_RESTARTING)
      await waitUntilAvailable()

      const res = await fetch('/api/books/blah')
      expect(res.status).toBe(200)
      await expect(res.text()).resolves.toBe('somebody')
      expect(getStrippedOutput()).toMatchStrippedSnapshot()
    })

    it('handles switching from an inline body to a fixture file', async () => {
      const configWrapper = new ConfigWrapper()
        .addTsconfig()
        .addConfig(new ConfigBuilder().withName('config').build())
      const { waitForOutput, waitUntilAvailable, getStrippedOutput } = await serve('--watch')

      configWrapper
        .editConfig('config', (c) => ({
          ...c,
          response: { serveBodyPath: './fixtures/my-fixture.json', code: c.response.code },
        }))
        .addFixture('my-fixture', { hello: 'world' })
      await waitForOutput(MESSAGE_RESTARTING)
      await waitUntilAvailable()

      const res = await fetch('/api/books/blah')
      expect(res.status).toBe(200)
      await expect(res.json()).resolves.toMatchObject({ hello: 'world' })
      expect(getStrippedOutput()).toMatchStrippedSnapshot()
    })
  })

  describe('type checking in watch mode', () => {
    describe('with schema loading from json files', () => {
      const typecheckingCleanup: CleanupTask[] = []
      let serve: ServeResult
      let configWrapper: ConfigWrapper
      const schemaName = 'Book'

      afterAll(() => {
        typecheckingCleanup.forEach((task) => task())
      })

      it('serves when the type matches the body', async () => {
        configWrapper = new ConfigWrapper()
          .addTsconfig()
          .addConfig(new ConfigBuilder().withResponseType(schemaName).withResponseBody('Hello!').build())
          .addSchemaFile(schemaName, { type: 'string' })

        serve = await prepareServe(typecheckingCleanup)(`--watch --schemaPath ${JSON_SCHEMAS_FOLDER}`)

        const res = await fetch('/api/books/123')
        expect(res.status).toBe(200)
        await expect(res.text()).resolves.toBe('Hello!')
        expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
      })

      it('restarts and fails when the json schema no longer matches', async () => {
        configWrapper.editSchemaFile(schemaName, { type: 'number' })
        await serve.waitForOutput(MESSAGE_RESTARTING_FAILURE)
        expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
      })

      it('can recover if the json schema matches the body again', async () => {
        configWrapper.editSchemaFile(schemaName, { type: 'string' })
        await serve.waitForOutput(MESSAGE_RESTARTING)
        await serve.waitUntilAvailable()

        const res = await fetch('/api/books/123')
        expect(res.status).toBe(200)
        await expect(res.text()).resolves.toBe('Hello!')
        expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
      })
    })

    describe('with schema generation', () => {
      const typecheckingCleanup: CleanupTask[] = []
      let serve: ServeResult
      let configWrapper: ConfigWrapper

      afterAll(() => {
        typecheckingCleanup.forEach((task) => task())
      })

      it('it serves when the type matches the body', async () => {
        configWrapper = new ConfigWrapper()
          .addTsconfig()
          .addConfig(new ConfigBuilder().withResponseType('Book').build())
          .addType('Book', {
            ISBN: 'string',
            ISBN_13: 'string',
            author: 'string',
            title: 'string',
          })

        serve = await prepareServe(typecheckingCleanup, 10)('--watch')

        await expect(fetch('/api/books/hello')).resolves.toMatchObject({ status: 200 })
        expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
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
        expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
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
        expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
      })

      it('stops the server if a source file changes that puts the type and response out of sync', async () => {
        configWrapper.editType('Book', (t) => ({ ...t, ISBN: 'number' }))

        await serve.waitForOutput(MESSAGE_RESTARTING_FAILURE)
        await serve.waitForOutput('<root>.ISBN should be number but got string')
        expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
      })

      it('can recover when a source file changes that fixes a type and response being out of sync', async () => {
        configWrapper.editType('Book', (t) => ({ ...t, ISBN: 'string' }))

        await serve.waitForOutput(MESSAGE_RESTARTING)
        await serve.waitUntilAvailable()
        await expect(fetch('/api/books/asdf')).resolves.toMatchObject({ status: 200 })
        expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
      })

      it('stops the server if a source file changes that breaks typescript compilation', async () => {
        configWrapper.editType('Book', (t) => ({ ...t, ISBN: 'what on earth?!' }))

        await serve.waitForOutput(
          'Your source code has compilation errors. Fix them to resume serving endpoints',
        )
        expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
      })

      it('can recover from the typescript compilation being broken', async () => {
        configWrapper.editType('Book', (t) => ({ ...t, ISBN: 'string' }))

        await serve.waitForOutput(MESSAGE_RESTARTING)
        await serve.waitUntilAvailable()
        await expect(fetch('/api/books/asdf')).resolves.toMatchObject({ status: 200 })
        expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
      })

      it('gives a useful message when an error is thrown during body/type validation', async () => {
        configWrapper.deleteType('Book')

        await serve.waitForOutput('An error occurred while validating a fixture')
        await serve.waitForOutput('Could not find type: Book')
        expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
      })
    })

    describe('when there are already typescript compilation errors', () => {
      it('gives a useful error and exits', async () => {
        new ConfigWrapper()
          .addTsconfig()
          .addConfig(new ConfigBuilder().withResponseType('Book').build())
          .addType('Book', {
            ISBN: 'what on earth!?',
            ISBN_13: 'string',
            author: 'number',
            title: 'string',
          })

        const { waitForOutput, getStrippedOutput } = await serve('--watch', false)

        await waitForOutput('Could not compile your typescript source files')
        expect(getStrippedOutput()).toMatchStrippedSnapshot()
      })
    })

    describe('when composite is true and noEmit is false during schema generation', () => {
      const cleanupTasks: CleanupTask[] = []

      afterEach(() => {
        cleanupTasks.forEach((task) => task())
      })

      it('does not show errors', async () => {
        new ConfigWrapper()
          .addTsconfig({
            ...ConfigWrapper.DefaultTsconfig,
            compilerOptions: {
              ...ConfigWrapper.DefaultTsconfig.compilerOptions,
              noEmit: false,
              composite: true,
              incremental: undefined,
            },
          })
          .addConfig(new ConfigBuilder().withResponseType('Book').build())
          .addType('Book', {
            ISBN: 'string',
            ISBN_13: 'string',
            author: 'string',
            title: 'string',
          })

        const serve = await prepareServe(cleanupTasks, 10)('--watch')

        await serve.waitForOutput('Endpoints are being served')
        expect(serve.getStrippedOutput()).toMatchStrippedSnapshot()
      })
    })
  })
})
