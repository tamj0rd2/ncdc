import request from 'supertest'
import { configureServer, Log } from './server'
import { MockConfig } from './config'
import ConfigBuilder from './config-builder'

describe('server', () => {
  const dateSpy = jest.spyOn(Date, 'now').mockImplementation()
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

  afterEach(() => jest.resetAllMocks())
  afterAll(() => jest.clearAllMocks())

  it('sends configurations when visiting /', async () => {
    const configs: MockConfig[] = [new ConfigBuilder().build()]

    const app = configureServer('mysite.com', configs)

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

  it.each(getCases)('serves the configured path %s', async (endpoint, pathToVisit) => {
    const configs: MockConfig[] = [new ConfigBuilder().withEndpoint(endpoint).build()]
    const app = configureServer('mysite.com', configs)

    await request(app)
      .get(pathToVisit)
      .expect(200)
      .expect('Hello, world!')
      .expect('Content-Type', /text\/html/)
  })

  it('logs registration for each configured endpoint', () => {
    const configs: MockConfig[] = [
      new ConfigBuilder().build(),
      new ConfigBuilder()
        .withName('Test2')
        .withEndpoint('/api/books/:id')
        .build(),
    ]

    configureServer('mysite.com', configs)

    expect(consoleSpy).toBeCalledTimes(2)
    expect(consoleSpy.mock.calls[0][0]).toMatch(/Registered mysite.com\/api\/resource from config:.*Test/)
    expect(consoleSpy.mock.calls[1][0]).toMatch(/Registered mysite.com\/api\/books\/:id from config:.*Test2/)
  })

  it('shows logs for previous requests at /logs', async () => {
    dateSpy.mockReturnValue(0)
    const configs: MockConfig[] = [
      new ConfigBuilder()
        .withName('Boom')
        .withEndpoint('/api/resource/:id')
        .withResponseCode(404)
        .withResponseBody('Hey!!')
        .build(),
    ]
    const app = configureServer('mysite.com', configs)

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
      config: 'Boom',
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

  it.todo('sets the Content-Type when provided')
})
