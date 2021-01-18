import { transformResources, ValidatedServeConfig } from './config'
import { randomString, mocked, serialiseAsJson } from '~test-helpers'
import { readFixture } from '~io'
import { Resource } from '~config'
import { Request, Response, Method } from '~config'

jest.disableAutomock()
jest.mock('path')
jest.mock('~io')

describe('transform configs', () => {
  function createTestDeps() {
    const mockReadFixture = mocked(readFixture)
    return {
      mockReadFixture,
    }
  }

  const createBasicConfig = (): ValidatedServeConfig => {
    return {
      name: randomString(),
      serveOnly: false,
      request: {
        method: Method.GET,
        endpoints: ['hola!'],
        headers: {},
        type: 'SomeType',
      },
      response: {
        code: 200,
        headers: { 'content-type': 'woah' },
        type: 'ResponseType',
      },
    }
  }

  it('returns the correct result for the most basic config', async () => {
    const config = createBasicConfig()
    config.request.endpoints = ['/api/1']

    const result = await transformResources([config], '')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject<Resource>(
      serialiseAsJson({
        name: config.name,
        request: new Request({
          endpoint: config.request.endpoints![0],
          method: config.request.method,
          headers: config.request.headers,
          type: config.request.type,
          body: config.request.body,
        }),
        response: new Response({
          code: config.response.code,
          headers: config.response.headers,
          type: config.response.type,
          body: config.response.body,
        }),
      }),
    )
  })

  it('returns multiple configs if there are multiple request endpoints', async () => {
    const config = createBasicConfig()
    config.request.endpoints = ['/api/1', '/api/2']

    const result = await transformResources([config], '')

    expect(result).toHaveLength(2)
    expect(result[0].request.endpoint.toString()).toBe(config.request.endpoints![0])
    expect(result[1].request.endpoint.toString()).toBe(config.request.endpoints![1])
  })

  const bodyCases = ['request', 'response'] as const
  it.each(bodyCases.map((x) => [x]))('sets the %s body when there is a body provided', async (property) => {
    const config = createBasicConfig()
    const expectedBody = randomString('body')
    config[property].body = expectedBody

    const [resource] = await transformResources([config], '')

    expect(resource[property].body?.get()).toBe(expectedBody)
  })

  it.each(bodyCases)('sets the %s body when there is a request bodyPath', async (property) => {
    const { mockReadFixture } = createTestDeps()
    const config = createBasicConfig()
    const bodyPath = randomString('bodyPath')
    config[property].bodyPath = bodyPath
    const expectedBody = randomString('expected body')
    mockReadFixture.mockResolvedValue(expectedBody)

    const configPath = randomString('config path')
    const [resource] = await transformResources([config], configPath)

    expect(mockReadFixture).toBeCalledWith(configPath, bodyPath)
    expect(resource[property].body?.get()).toBe(expectedBody)
  })

  it('sets the response body when a serveBodyPath is provided', async () => {
    const { mockReadFixture } = createTestDeps()
    const config = createBasicConfig()
    const bodyPath = randomString('bodyPath')
    config.response.serveBodyPath = bodyPath
    const expectedBody = randomString('expected body')
    mockReadFixture.mockResolvedValue(expectedBody)

    const configPath = randomString('config path')
    const [resource] = await transformResources([config], configPath)

    expect(mockReadFixture).toBeCalledWith(configPath, bodyPath)
    expect(resource.response.body?.get()).toBe(expectedBody)
  })
})
