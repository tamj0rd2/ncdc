import { transformResources, ValidatedServeConfig } from './config'
import { randomString, mocked } from '~test-helpers'
import { readFixture } from '~io'
import dot from 'dot-object'
import { Resource } from '~config/types'
import { Endpoint } from '~config/resource'

jest.disableAutomock()
jest.mock('path')
jest.mock('~io')

describe('transform configs', () => {
  const mockReadFixture = mocked(readFixture)

  const createBasicConfig = (): ValidatedServeConfig => {
    return {
      name: randomString(),
      serveOnly: false,
      request: {
        method: 'GET',
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
    expect(result[0]).toMatchObject<Resource>({
      name: config.name,
      request: {
        endpoint: new Endpoint(config.request.endpoints![0]),
        method: config.request.method,
        headers: config.request.headers,
        type: config.request.type,
      },
      response: {
        code: config.response.code,
        headers: config.response.headers,
        type: config.response.type,
      },
    })
  })

  it('returns multiple configs if there are multiple request endpoints', async () => {
    const config = createBasicConfig()
    config.request.endpoints = ['/api/1', '/api/2']

    const result = await transformResources([config], '')

    expect(result).toHaveLength(2)
    expect(result[0].request.endpoint.toString()).toBe(config.request.endpoints![0])
    expect(result[1].request.endpoint.toString()).toBe(config.request.endpoints![1])
  })

  const bodyCases = ['request.body', 'response.body']
  it.each(bodyCases.map((x) => [x]))('sets the %s', async (key) => {
    const config = createBasicConfig()
    dot.set(key, randomString(), config)

    const result = await transformResources([config], '')

    expect(result).toHaveLength(1)
    const body = dot.pick(key, result[0])
    expect(body).toBeDefined()
    expect(body).toBe(dot.pick(key, config))
  })

  // const bodyPathCases = ['request.bodyPath', 'response.bodyPath', 'response.serveBodyPath']
  const bodyPathCases = [
    ['request.bodyPath', 'request.body'],
    ['response.bodyPath', 'response.body'],
    ['response.serveBodyPath', 'response.body'],
  ]
  describe.each(bodyPathCases.map((x) => [x]))('when %s is present', ([pathToBody, destination]) => {
    mockReadFixture.mockResolvedValue({ nice: 'one' })

    it(`sets a body when a ${pathToBody} fixture is provided`, async () => {
      const config = createBasicConfig()
      const fixturePath = randomString()
      dot.set(pathToBody, fixturePath, config)
      const configPath = randomString('configPath')

      const result = await transformResources([config], configPath)

      expect(mockReadFixture).toBeCalledWith(configPath, fixturePath)
      expect(result).toHaveLength(1)
      expect(dot.pick(destination, result[0])).toStrictEqual({ nice: 'one' })
    })
  })
})
