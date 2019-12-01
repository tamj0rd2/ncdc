import request from 'supertest'
import { configureServer } from './server'
import { MockConfig } from './config'

describe('server', () => {
  const defaultConfig = (endpoint = '/api/resource', name = 'Test'): MockConfig => ({
    name: name,
    request: { method: 'GET', endpoint },
    response: { body: 'Hello, world!' },
  })

  const dateSpy = jest.spyOn(Date, 'now').mockImplementation()
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

  afterEach(() => jest.resetAllMocks())
  afterAll(() => jest.clearAllMocks())

  it('sends configurations when visiting /', async () => {
    const configs: MockConfig[] = [defaultConfig()]

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
    const configs: MockConfig[] = [defaultConfig(endpoint)]
    const app = configureServer('mysite.com', configs)

    await request(app)
      .get(pathToVisit)
      .expect(200)
      .expect('Hello, world!')
  })

  it('logs registration for each configured endpoint', () => {
    const configs: MockConfig[] = [defaultConfig(), defaultConfig('/api/books/:id', 'Test2')]

    const app = configureServer('mysite.com', configs)

    expect(consoleSpy).toBeCalledTimes(2)
    expect(consoleSpy.mock.calls[0][0]).toMatch(/Registered mysite.com\/api\/resource from config:.*Test/)
    expect(consoleSpy.mock.calls[1][0]).toMatch(/Registered mysite.com\/api\/books\/:id from config:.*Test2/)
  })

  it('shows logs for previous requests at /logs', async () => {
    dateSpy.mockReturnValue(0)
    const configs: MockConfig[] = [defaultConfig('/api/resource/:id')]
    const app = configureServer('mysite.com', configs)

    await request(app).get('/api/resource/22?ayy=lmao')
    const { body } = await request(app)
      .get('/logs')
      .expect(200)
      .expect('Content-Type', /json/)

    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      method: 'GET',
      path: '/api/resource/22',
      query: { ayy: 'lmao' },
      headers: {},
    })
  })
})
