import request from 'supertest'
import { configureApp, verbsMap, PossibleMethod, ReqResLog, GetTypeValidator } from './app'
import { ResourceBuilder, SupportedMethod } from '~config'
import { TypeValidator } from '~validation'
import { mockObj, mockFn, serialiseAsJson, randomString } from '~test-helpers'
import { NcdcLogger } from '~logger'

describe('server', () => {
  function createTestDeps() {
    const mockTypeValidator = mockObj<TypeValidator>({ assert: jest.fn() })
    const mockLogger = mockObj<NcdcLogger>({
      info: jest.fn(),
      verbose: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    })
    return {
      mockTypeValidator,
      mockLogger,
      dummyBaseUrl: randomString('base-url'),
      mockGetTypeValidator: mockFn<GetTypeValidator>(),
      configureApp,
    }
  }

  afterEach(() => jest.resetAllMocks())

  it('sends configurations when visiting /', async () => {
    const {
      dummyBaseUrl,
      mockGetTypeValidator,
      mockLogger,
      mockTypeValidator,
      configureApp,
    } = createTestDeps()
    mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)

    const resource = new ResourceBuilder().withRequestType('Some Type').build()
    const app = configureApp(dummyBaseUrl, [resource], mockGetTypeValidator, mockLogger)

    await request(app)
      .get('/')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect([serialiseAsJson(resource)])
  })

  const { HEAD, ...verbsMinusHead } = verbsMap
  const methodCases = Object.entries(verbsMinusHead) as [SupportedMethod, PossibleMethod][]

  it.each(methodCases)('handles a basic request with method: %s', async (verb, method) => {
    const {
      dummyBaseUrl,
      mockGetTypeValidator,
      mockLogger,
      mockTypeValidator,
      configureApp,
    } = createTestDeps()
    mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
    const endpoint = '/api/resource'

    const resources = [new ResourceBuilder().withEndpoint(endpoint).withMethod(verb).build()]
    const app = configureApp(dummyBaseUrl, resources, mockGetTypeValidator, mockLogger)

    await request(app)
      [method](endpoint)
      .expect(200)
      .expect('Hello, world!')
      .expect('Content-Type', /text\/html/)
  })

  it('handles a basic request with method: HEAD', async () => {
    const {
      dummyBaseUrl,
      mockGetTypeValidator,
      mockLogger,
      mockTypeValidator,
      configureApp,
    } = createTestDeps()
    mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
    const endpoint = '/api/resource'
    const resources = [new ResourceBuilder().withEndpoint(endpoint).withMethod(SupportedMethod.HEAD).build()]

    const app = configureApp(dummyBaseUrl, resources, mockGetTypeValidator, mockLogger)

    await request(app).head(endpoint).expect(200)
  })

  const getCases: [string, string][] = [
    ['/api/resource', '/api/resource'],
    ['/api/resource*', '/api/resource/thing/aling'],
    ['/api/resource/:param', '/api/resource/something'],
  ]

  it.each(getCases)('serves routes matching the configured path %s', async (endpoint, pathToVisit) => {
    const {
      dummyBaseUrl,
      mockGetTypeValidator,
      mockLogger,
      mockTypeValidator,
      configureApp,
    } = createTestDeps()
    mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
    const resources = [new ResourceBuilder().withEndpoint(endpoint).withMethod(SupportedMethod.GET).build()]
    const app = configureApp(dummyBaseUrl, resources, mockGetTypeValidator, mockLogger)

    await request(app)
      .get(pathToVisit)
      .expect(200)
      .expect('Hello, world!')
      .expect('Content-Type', /text\/html/)
  })

  it('returns a 404 when the requested endpoint could not be found', async () => {
    const {
      dummyBaseUrl,
      mockGetTypeValidator,
      mockLogger,
      mockTypeValidator,
      configureApp,
    } = createTestDeps()
    mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
    const resources = [new ResourceBuilder().withEndpoint('/almost/correct').build()]

    const app = configureApp(dummyBaseUrl, resources, mockGetTypeValidator, mockLogger)

    await request(app)
      .get('/nearly/correct')
      .expect(/NCDC ERROR: Could not find an endpoint/)
      .expect(404)
  })

  it('logs successful requests', async () => {
    const {
      dummyBaseUrl,
      mockGetTypeValidator,
      mockLogger,
      mockTypeValidator,
      configureApp,
    } = createTestDeps()
    mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
    const resources = [
      new ResourceBuilder().withEndpoint('/api/resource').withResponseBody(undefined).build(),
    ]

    const app = configureApp(dummyBaseUrl, resources, mockGetTypeValidator, mockLogger)
    await request(app).get('/api/resource?what=up').expect(200)

    expect(mockLogger.info).toBeCalled()
    expect(mockLogger.info.mock.calls[0][0]).toMatchObject<ReqResLog>({
      name: resources[0].name,
      request: {
        method: 'GET',
        body: {},
        path: '/api/resource',
        query: { what: 'up' },
      },
      response: {
        status: 200,
        body: undefined,
      },
    })
  })

  describe('request', () => {
    describe('headers', () => {
      const resource = new ResourceBuilder()
        .withResponseCode(200)
        .withRequestHeaders({ nice: 'meme' })
        .build()

      it('fails when configured headers are not given', async () => {
        const {
          dummyBaseUrl,
          mockGetTypeValidator,
          mockLogger,
          mockTypeValidator,
          configureApp,
        } = createTestDeps()
        mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
        const app = configureApp(dummyBaseUrl, [resource], mockGetTypeValidator, mockLogger)

        await request(app).get(resource.request.endpoint.toString()).send().expect(404)
      })

      it('passes when configured headers are given', async () => {
        const {
          dummyBaseUrl,
          mockGetTypeValidator,
          mockLogger,
          mockTypeValidator,
          configureApp,
        } = createTestDeps()
        mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
        const app = configureApp(dummyBaseUrl, [resource], mockGetTypeValidator, mockLogger)

        await request(app).get(resource.request.endpoint.toString()).set('nice', 'meme').expect(200)
      })
    })

    describe('query', () => {
      it('still responds when a query matches in a different order', async () => {
        const {
          dummyBaseUrl,
          mockGetTypeValidator,
          mockLogger,
          mockTypeValidator,
          configureApp,
        } = createTestDeps()
        mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
        const resources = [
          new ResourceBuilder().withEndpoint('/api/resource?greetings=hello&greetings=bye').build(),
        ]

        const app = configureApp(dummyBaseUrl, resources, mockGetTypeValidator, mockLogger)

        await request(app).get('/api/resource?greetings=bye&greetings=hello').expect(200)
      })

      it('responds when a query matches a different resource', async () => {
        const {
          dummyBaseUrl,
          mockGetTypeValidator,
          mockLogger,
          mockTypeValidator,
          configureApp,
        } = createTestDeps()
        mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
        const resources = [
          new ResourceBuilder()
            .withName('Config1')
            .withEndpoint('/api/resource?greetings=hello&greetings=bye')
            .withResponseBody('nope')
            .build(),
          new ResourceBuilder()
            .withName('Config2')
            .withEndpoint('/api/resource?greetings=hi&greetings=bye')
            .withResponseCode(202)
            .withResponseBody('YES')
            .build(),
        ]

        const app = configureApp(dummyBaseUrl, resources, mockGetTypeValidator, mockLogger)

        await request(app).get('/api/resource?greetings=hi&greetings=bye').expect(202).expect('YES')
      })

      it('gives a 404 if a query does not match any resource', async () => {
        const {
          dummyBaseUrl,
          mockGetTypeValidator,
          mockLogger,
          mockTypeValidator,
          configureApp,
        } = createTestDeps()
        mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
        const resources = [
          new ResourceBuilder().withEndpoint('/api/resource?greetings=hello&greetings=bye').build(),
        ]

        const app = configureApp(dummyBaseUrl, resources, mockGetTypeValidator, mockLogger)

        await request(app).get('/api/resource?greetings=yellow&greetings=bye').expect(404)
      })
    })

    describe('type', () => {
      it('returns the desired response when the request body passes type validation', async () => {
        const {
          dummyBaseUrl,
          mockGetTypeValidator,
          mockLogger,
          mockTypeValidator,
          configureApp,
        } = createTestDeps()
        mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
        const resources = [
          new ResourceBuilder()
            .withMethod(SupportedMethod.POST)
            .withEndpoint('/config1')
            .withRequestType('number')
            .withResponseCode(401)
            .withResponseBody('Noice')
            .build(),
        ]

        const app = configureApp(dummyBaseUrl, resources, mockGetTypeValidator, mockLogger)

        await request(app)
          .post(resources[0].request.endpoint.toString())
          .send('Yo dude!')
          .expect(401)
          .expect('Noice')
      })

      it('gives a 404 when the request body fails type validation', async () => {
        const {
          dummyBaseUrl,
          mockGetTypeValidator,
          mockLogger,
          mockTypeValidator,
          configureApp,
        } = createTestDeps()
        mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
        const resources = [
          new ResourceBuilder()
            .withMethod(SupportedMethod.POST)
            .withEndpoint('/config1')
            .withRequestType('number')
            .build(),
        ]
        mockTypeValidator.assert.mockRejectedValue(new Error('whoops'))

        const app = configureApp(dummyBaseUrl, resources, mockGetTypeValidator, mockLogger)

        await request(app)
          .post(resources[0].request.endpoint.toString())
          .send('Yo dude!')
          .expect(404)
          .expect(/NCDC ERROR: Could not find an endpoint/)
      })
    })

    describe('body', () => {
      it('decodes url encoded form data when sent in the request', async () => {
        const {
          dummyBaseUrl,
          mockGetTypeValidator,
          mockLogger,
          mockTypeValidator,
          configureApp,
        } = createTestDeps()
        mockGetTypeValidator.mockResolvedValue(mockTypeValidator)
        const resource = new ResourceBuilder()
          .withMethod(SupportedMethod.POST)
          .withRequestBody({ hello: 'world' })
          .withRequestHeaders({ 'content-type': 'application/x-www-form-urlencoded' })
          .build()

        const app = configureApp(dummyBaseUrl, [resource], mockGetTypeValidator, mockLogger)

        await request(app).post(resource.request.endpoint.toString()).send('hello=world').expect(200)
      })

      it('returns a 404 when a request body is missing', async () => {
        const {
          dummyBaseUrl,
          mockGetTypeValidator,
          mockLogger,
          mockTypeValidator,
          configureApp,
        } = createTestDeps()
        mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
        const resource = new ResourceBuilder().withRequestBody('hello  there  ').build()

        const app = configureApp(dummyBaseUrl, [resource], mockGetTypeValidator, mockLogger)

        await request(app).get(resource.request.endpoint.toString()).expect(404)
      })

      it('returns a 404 when the request bodies do not match', async () => {
        const {
          dummyBaseUrl,
          mockGetTypeValidator,
          mockLogger,
          mockTypeValidator,
          configureApp,
        } = createTestDeps()
        mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
        const resource = new ResourceBuilder().withRequestBody({ hello: 'world' }).build()

        const app = configureApp(dummyBaseUrl, [resource], mockGetTypeValidator, mockLogger)

        await request(app).get(resource.request.endpoint.toString()).send({ hello: 'werld' }).expect(404)
      })

      it('ignores body validation if request.type is specified', async () => {
        const {
          dummyBaseUrl,
          mockGetTypeValidator,
          mockLogger,
          mockTypeValidator,
          configureApp,
        } = createTestDeps()
        mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
        const resource = new ResourceBuilder()
          .withRequestBody({ hello: 'world' })
          .withRequestType('memes')
          .build()

        const app = configureApp(dummyBaseUrl, [resource], mockGetTypeValidator, mockLogger)

        // await request(app).get(resource.request.endpoint.toString()).send({ ayy: 'lmao' }).expect(200)
        await request(app).get(resource.request.endpoint.toString()).send({ ayy: 'lmao' })

        expect(mockLogger.warn).not.toBeCalled()
        expect(mockLogger.error).not.toBeCalled()
      })
    })
  })

  describe('response', () => {
    describe('headers', () => {
      it('sets the headers when provided', async () => {
        const {
          dummyBaseUrl,
          mockGetTypeValidator,
          mockLogger,
          mockTypeValidator,
          configureApp,
        } = createTestDeps()
        mockGetTypeValidator.mockResolvedValueOnce(mockTypeValidator)
        const resources = [
          new ResourceBuilder()
            .withResponseHeaders({
              'content-type': 'application/xml',
              'another-header': 'my value',
            })
            .build(),
        ]

        const app = configureApp(dummyBaseUrl, resources, mockGetTypeValidator, mockLogger)

        await request(app)
          .get(resources[0].request.endpoint.toString())
          .expect('Content-Type', /application\/xml/)
          .expect('another-header', 'my value')
      })
    })
  })
})
