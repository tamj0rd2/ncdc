import request from 'supertest'
import { configureServer, Log } from './server'
import { ConfigBuilder } from '~config'
import { TypeValidator } from '~validation'
import Problem from '~problem'
import { mockObj } from '~test-helpers'

jest.disableAutomock()
jest.mock('./logger')

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
