import request from 'supertest'
import { configureServer, Log } from './server'
import RouteConfigBuilder from './route-config-builder'
import TypeValidator from '../validation/type-validator'

describe('server', () => {
  const dateSpy = jest.spyOn(Date, 'now').mockImplementation()
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
  const mockTypeValidator = mockObj<TypeValidator>({})

  afterEach(() => jest.resetAllMocks())
  afterAll(() => jest.clearAllMocks())

  it('sends configurations when visiting /', async () => {
    const configs = [new RouteConfigBuilder().withRequestBodyType('Some Type').build()]

    const app = configureServer('mysite.com', configs, mockTypeValidator)

    await request(app)
      .get('/')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(configs)
  })

  const getCases: [string, string][] = [
    ['/api/resource', '/api/resource'],
    ['/api/resource*', '/api/resource/thing/aling'],
    ['/api/resource/:param', '/api/resource/something'],
  ]

  it.each(getCases)('serves the configured path %s for GET requests', async (endpoint, pathToVisit) => {
    const configs = [
      new RouteConfigBuilder()
        .withEndpoint(endpoint)
        .withMethod('GET')
        .build(),
    ]
    const app = configureServer('mysite.com', configs, mockTypeValidator)

    await request(app)
      .get(pathToVisit)
      .expect(200)
      .expect('Hello, world!')
      .expect('Content-Type', /text\/html/)
  })

  it.each(getCases)('serves the configured path %s for POST requests', async (endpoint, pathToVisit) => {
    const configs = [
      new RouteConfigBuilder()
        .withEndpoint(endpoint)
        .withMethod('POST')
        .build(),
    ]
    const app = configureServer('mysite.com', configs, mockTypeValidator)

    await request(app)
      .post(pathToVisit)
      .expect(200)
      .expect('Hello, world!')
      .expect('Content-Type', /text\/html/)
  })

  it('logs registration for each configured endpoint', () => {
    const configs = [
      new RouteConfigBuilder().build(),
      new RouteConfigBuilder()
        .withName('Test2')
        .withEndpoint('/api/books/:id')
        .build(),
    ]

    configureServer('mysite.com', configs, mockTypeValidator)

    expect(consoleSpy).toBeCalledTimes(2)
    expect(consoleSpy.mock.calls[0][0]).toMatch(/Registered mysite.com\/api\/resource from config:.*Test/)
    expect(consoleSpy.mock.calls[1][0]).toMatch(/Registered mysite.com\/api\/books\/:id from config:.*Test2/)
  })

  it('shows logs for previous requests at /logs', async () => {
    dateSpy.mockReturnValue(0)
    const configs = [
      new RouteConfigBuilder()
        .withName('Boom')
        .withEndpoint('/api/resource/:id')
        .withResponseCode(404)
        .withResponseBody('Hey!!')
        .build(),
    ]
    const app = configureServer('mysite.com', configs, mockTypeValidator)

    await request(app)
      .get('/api/resource/22?ayy=lmao')
      .expect(404)
    const body = (
      await request(app)
        .get('/logs')
        .expect(200)
        .expect('Content-Type', /json/)
    ).body as Log[]

    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      name: 'Boom',
      timestamp: '1970-01-01T00:00:00.000Z',
      request: {
        method: 'GET',
        path: '/api/resource/22',
        query: { ayy: 'lmao' },
        headers: {},
      },
      response: {
        body: 'Hey!!',
        status: 404,
        headers: {},
      },
    })
  })

  it('sets the response headers when provided', async () => {
    const configs = [
      new RouteConfigBuilder()
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

  it('returns a custom 404 when the requested endpoint could not be found', async () => {
    const configs = [new RouteConfigBuilder().withEndpoint('/almost/correct').build()]

    const app = configureServer('mysite.com', configs, mockTypeValidator)

    await request(app)
      .get('/nearly/correct')
      .expect(/NCDC ERROR: Could not find an endpoint/)
      .expect(404)
  })
})
