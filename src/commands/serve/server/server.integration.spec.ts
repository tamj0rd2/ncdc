import request from 'supertest'
import { configureServer, verbsMap, PossibleMethod, ReqResLog } from '.'
import { ConfigBuilder, SupportedMethod } from '~config'
import { TypeValidator } from '~validation'
import Problem from '~problem'
import { mockObj, mocked } from '~test-helpers'
import serverLogger from './server-logger'

jest.mock('./server-logger')

describe('server', () => {
  jest.spyOn(console, 'dir').mockImplementation()
  const mockTypeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })

  afterEach(() => jest.resetAllMocks())
  afterAll(() => jest.clearAllMocks())

  it('sends configurations when visiting /', async () => {
    const configs = [new ConfigBuilder().withRequestType('Some Type').build()]

    const app = configureServer('mysite.com', configs, mockTypeValidator)

    await request(app).get('/').expect(200).expect('Content-Type', /json/).expect(configs)
  })

  const { HEAD, ...verbsMinusHead } = verbsMap
  const methodCases = Object.entries(verbsMinusHead) as [SupportedMethod, PossibleMethod][]

  it.each(methodCases)('handles a basic request with method: %s', async (verb, method) => {
    const endpoint = '/api/resource'

    const configs = [new ConfigBuilder().withEndpoint(endpoint).withMethod(verb).build()]

    const app = configureServer('example.com', configs, mockTypeValidator)

    await request(app)
      [method](endpoint)
      .expect(200)
      .expect('Hello, world!')
      .expect('Content-Type', /text\/html/)
  })

  it('handles a basic request with method: HEAD', async () => {
    const endpoint = '/api/resource'

    const configs = [new ConfigBuilder().withEndpoint(endpoint).withMethod('HEAD').build()]

    const app = configureServer('example.com', configs, mockTypeValidator)

    await request(app).head(endpoint).expect(200)
  })

  const getCases: [string, string][] = [
    ['/api/resource', '/api/resource'],
    ['/api/resource*', '/api/resource/thing/aling'],
    ['/api/resource/:param', '/api/resource/something'],
  ]

  it.each(getCases)('serves routes matching the configured path %s', async (endpoint, pathToVisit) => {
    const configs = [new ConfigBuilder().withEndpoint(endpoint).withMethod('GET').build()]
    const app = configureServer('mysite.com', configs, mockTypeValidator)

    await request(app)
      .get(pathToVisit)
      .expect(200)
      .expect('Hello, world!')
      .expect('Content-Type', /text\/html/)
  })

  it('returns a 404 when the requested endpoint could not be found', async () => {
    const configs = [new ConfigBuilder().withEndpoint('/almost/correct').build()]

    const app = configureServer('mysite.com', configs, mockTypeValidator)

    await request(app)
      .get('/nearly/correct')
      .expect(/NCDC ERROR: Could not find an endpoint/)
      .expect(404)
  })

  it('logs successful requests', async () => {
    const configs = [new ConfigBuilder().withEndpoint('/api/resource').withResponseBody(undefined).build()]

    const app = configureServer('example.com', configs)
    await request(app).get('/api/resource?what=up').expect(200)

    const mockedLogger = mocked(serverLogger.info)
    expect(mockedLogger).toBeCalled()
    expect(mockedLogger.mock.calls[1][0]).toMatchObject<ReqResLog>({
      name: configs[0].name,
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

  describe('headers', () => {
    it('sets the response headers when provided', async () => {
      const configs = [
        new ConfigBuilder()
          .withResponseHeaders({
            'content-type': 'application/xml',
            'another-header': 'my value',
          })
          .build(),
      ]

      const app = configureServer('mysite.com', configs, mockTypeValidator)

      await request(app)
        .get(configs[0].request.endpoint)
        .expect('Content-Type', /application\/xml/)
        .expect('another-header', 'my value')
    })
  })

  describe('request query strings', () => {
    it('still responds when a query matches in a different order', async () => {
      const configs = [
        new ConfigBuilder().withEndpoint('/api/resource?greetings=hello&greetings=bye').build(),
      ]

      const app = configureServer('example.com', configs)

      await request(app).get('/api/resource?greetings=bye&greetings=hello').expect(200)
    })

    it('responds when a query matches a different config', async () => {
      const configs = [
        new ConfigBuilder()
          .withName('Config1')
          .withEndpoint('/api/resource?greetings=hello&greetings=bye')
          .withResponseBody('nope')
          .build(),
        new ConfigBuilder()
          .withName('Config2')
          .withEndpoint('/api/resource?greetings=hi&greetings=bye')
          .withResponseCode(202)
          .withResponseBody('YES')
          .build(),
      ]

      const app = configureServer('example.com', configs)

      await request(app).get('/api/resource?greetings=hi&greetings=bye').expect(202).expect('YES')
    })

    it('gives a 404 if a query does not match any config', async () => {
      const configs = [
        new ConfigBuilder().withEndpoint('/api/resource?greetings=hello&greetings=bye').build(),
      ]

      const app = configureServer('example.com', configs)

      await request(app).get('/api/resource?greetings=yellow&greetings=bye').expect(404)
    })
  })

  describe('type validation', () => {
    it('returns the desired response when the request body passes type validation', async () => {
      const configs = [
        new ConfigBuilder()
          .withMethod('POST')
          .withEndpoint('/config1')
          .withRequestType('number')
          .withResponseCode(404)
          .withResponseBody('Noice')
          .build(),
      ]

      const app = configureServer('mysite.com', configs, mockTypeValidator)

      await request(app).post(configs[0].request.endpoint).send('Yo dude!').expect(404).expect('Noice')
    })

    it('gives a 404 when the request body fails type validation', async () => {
      const configs = [
        new ConfigBuilder().withMethod('POST').withEndpoint('/config1').withRequestType('number').build(),
      ]

      const problem: Partial<Problem> = { message: 'Welp!' }
      mockTypeValidator.getProblems.mockResolvedValue([problem as Problem])

      const app = configureServer('mysite.com', configs, mockTypeValidator)

      await request(app)
        .post(configs[0].request.endpoint)
        .send('Yo dude!')
        .expect(404)
        .expect(/NCDC ERROR: Could not find an endpoint/)
    })
  })
})
