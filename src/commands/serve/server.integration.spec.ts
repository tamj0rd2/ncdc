import request from 'supertest'
import { configureServer, verbsMap, PossibleMethod } from './server'
import { ConfigBuilder, SupportedMethod } from '~config'
import { TypeValidator } from '~validation'
import Problem from '~problem'
import { mockObj } from '~test-helpers'

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
