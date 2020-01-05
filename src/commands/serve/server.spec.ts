import request from 'supertest'
import { configureServer, Log } from './server'
import ConfigBuilder from '../../config/config-builder'
import TypeValidator from '../../validation/type-validator'
import Problem from '../../problem'
import { mockObj } from '../../test-helpers'

describe('server', () => {
  const dateSpy = jest.spyOn(Date, 'now').mockImplementation()
  const logSpy = jest.spyOn(console, 'log').mockImplementation()
  jest.spyOn(console, 'dir').mockImplementation()
  const mockTypeValidator = mockObj<TypeValidator>({ getProblems: jest.fn() })

  afterEach(() => jest.resetAllMocks())
  afterAll(() => jest.clearAllMocks())

  it('sends configurations when visiting /', async () => {
    const configs = [new ConfigBuilder().withRequestType('Some Type').build()]

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
      new ConfigBuilder()
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
      new ConfigBuilder()
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

  it.skip('logs registration for each configured endpoint', () => {
    const configs = [
      new ConfigBuilder().build(),
      new ConfigBuilder()
        .withName('Test2')
        .withEndpoint('/api/books/:id')
        .build(),
    ]

    configureServer('mysite.com', configs, mockTypeValidator)

    expect(logSpy).toBeCalledTimes(2)
    expect(logSpy.mock.calls[0][0]).toMatch(/Registered mysite.com\/api\/resource from config:.*Test/)
    expect(logSpy.mock.calls[1][0]).toMatch(/Registered mysite.com\/api\/books\/:id from config:.*Test2/)
  })

  it.skip('shows logs for previous requests at /logs', async () => {
    dateSpy.mockReturnValue(0)
    const configs = [
      new ConfigBuilder()
        .withName('Boom')
        .withMethod('POST')
        .withEndpoint('/api/resource/:id')
        .withResponseCode(404)
        .withResponseBody('Hey!!')
        .build(),
    ]
    const app = configureServer('mysite.com', configs, mockTypeValidator)

    await request(app)
      .post('/api/resource/22?ayy=lmao')
      .set('Content-Type', 'text/plain')
      .send('Woah!')
      .expect(404)
    const body = (
      await request(app)
        .get('/logs')
        .expect(200)
        .expect('Content-Type', /json/)
    ).body as Log[]

    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('Boom')
    expect(body[0].timestamp).toBe('1970-01-01T00:00:00.000Z')
    expect(body[0].request).toMatchObject({
      method: 'POST',
      path: '/api/resource/22',
      query: { ayy: 'lmao' },
      headers: {},
      body: 'Woah!',
    })
    expect(body[0].response).toMatchObject({
      body: 'Hey!!',
      status: 404,
      headers: {},
    })
  })

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

  it('returns a custom 404 when the requested endpoint could not be found', async () => {
    const configs = [new ConfigBuilder().withEndpoint('/almost/correct').build()]

    const app = configureServer('mysite.com', configs, mockTypeValidator)

    await request(app)
      .get('/nearly/correct')
      .expect(/NCDC ERROR: Could not find an endpoint/)
      .expect(404)
  })

  it('returns the desired response when the request body passes validation', async () => {
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

    await request(app)
      .post(configs[0].request.endpoint)
      .send('Yo dude!')
      .expect(404)
      .expect('Noice')
  })

  it('gives a 404 when the request body fails type validation', async () => {
    const configs = [
      new ConfigBuilder()
        .withMethod('POST')
        .withEndpoint('/config1')
        .withRequestType('number')
        .build(),
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
