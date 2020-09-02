import { mocked, randomString, serialiseAsJson } from '~test-helpers'
import { readFixture } from '~io'
import { ValidatedTestConfig, transformConfigs } from './config'
import { Resource } from '~config'
import { Request, Response, SupportedMethod } from '~config'

jest.disableAutomock()
jest.mock('~io')

describe('transform configs', () => {
  function createTestDeps() {
    const mockReadFixture = mocked(readFixture)
    return {
      mockReadFixture,
    }
  }

  const createBasicConfig = (): ValidatedTestConfig => {
    return {
      name: randomString(),
      serveOnly: false,
      request: {
        method: SupportedMethod.GET,
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

    const result = await transformConfigs([config], '')

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

    const result = await transformConfigs([config], '')

    expect(result).toHaveLength(2)
    expect(result[0].request.endpoint.toString()).toBe(config.request.endpoints![0])
    expect(result[1].request.endpoint.toString()).toBe(config.request.endpoints![1])
  })

  const bodyCases = ['request', 'response'] as const
  it.each(bodyCases.map((x) => [x]))('sets the %s', async (key) => {
    const config = createBasicConfig()
    const expectedBody = randomString('body')
    config[key].body = expectedBody

    const [resource] = await transformConfigs([config], '')

    expect(resource[key].body!.get()).toBe(expectedBody)
  })

  it.each(bodyCases)(`loads and sets a body when %s bodyPath is provided`, async (key) => {
    const { mockReadFixture } = createTestDeps()

    const config = createBasicConfig()
    const expectedBodyPath = randomString('body path')
    config[key].bodyPath = expectedBodyPath
    const configPath = randomString('configPath')
    const expectedBody = { nice: 'one' }
    mockReadFixture.mockResolvedValue(expectedBody)

    const [resource] = await transformConfigs([config], configPath)

    expect(mockReadFixture).toBeCalledWith(configPath, expectedBodyPath)
    expect(resource[key].body!.get()).toStrictEqual(expectedBody)
  })
})
